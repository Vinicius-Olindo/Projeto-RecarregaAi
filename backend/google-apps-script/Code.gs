// RecarregaAi! 2.4.0

const FEEDBACK_RECIPIENT = "olinbytedigital@gmail.com";
const FEEDBACK_PAGE_ORIGIN = "https://recarregaai.pages.dev";
const FEEDBACK_RESPONSE_SOURCE = "recarregaai-feedback";
const EXTENSION_ORIGIN_PATTERN = /^chrome-extension:\/\/[a-p]{32}$/;
const DAILY_COUNTER_PROPERTY = "recarregaAiFeedbackDailyCounter";
const MAX_IDENTICAL_SUBMISSIONS_PER_WINDOW = 3;
const MAX_SUBMISSIONS_PER_DAY = 40;
const MAX_SUBMISSIONS_PER_MINUTE = 5;
const MAXIMUM_FORM_AGE_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const MINIMUM_FORM_AGE_IN_MILLISECONDS = 3 * 1000;

function doPost(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const submissionId = cleanText_(parameters.submissionId, 100);
  const responseOrigin = getResponseOrigin_(parameters.responseOrigin);

  try {
    validateSubmission_(parameters, submissionId);

    if (cleanText_(parameters.website, 200)) {
      return createResponse_(
        true,
        submissionId,
        "Feedback recebido.",
        responseOrigin
      );
    }

    const submissionState = reserveSubmission_(parameters, submissionId);

    if (submissionState === "duplicate") {
      return createResponse_(
        true,
        submissionId,
        "Feedback ja recebido.",
        responseOrigin
      );
    }

    sendFeedbackEmail_(parameters);
    confirmSubmission_(submissionId);

    return createResponse_(
      true,
      submissionId,
      "Feedback enviado.",
      responseOrigin
    );
  } catch (error) {
    releaseSubmission_(submissionId);
    console.error("Falha ao processar feedback:", error);

    return createResponse_(
      false,
      submissionId,
      "Nao foi possivel enviar o feedback.",
      responseOrigin
    );
  }
}

function getResponseOrigin_(requestedOrigin) {
  const origin = cleanText_(requestedOrigin, 200);

  if (origin === FEEDBACK_PAGE_ORIGIN || EXTENSION_ORIGIN_PATTERN.test(origin)) {
    return origin;
  }

  return FEEDBACK_PAGE_ORIGIN;
}

function validateSubmission_(parameters, submissionId) {
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(submissionId)) {
    throw new Error("Identificador de envio invalido.");
  }

  if (!cleanText_(parameters.motivo, 200)) {
    throw new Error("Motivo nao informado.");
  }

  const contactEmail = cleanText_(parameters.email, 254);

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error("E-mail de contato invalido.");
  }

  const startedAt = new Date(cleanText_(parameters.startedAt, 60)).getTime();
  const formAge = Date.now() - startedAt;

  if (
    !Number.isFinite(startedAt)
    || formAge < MINIMUM_FORM_AGE_IN_MILLISECONDS
    || formAge > MAXIMUM_FORM_AGE_IN_MILLISECONDS
  ) {
    throw new Error("Tempo de preenchimento invalido.");
  }
}

function reserveSubmission_(parameters, submissionId) {
  const cache = CacheService.getScriptCache();
  const sentKey = `sent:${submissionId}`;
  const pendingKey = `pending:${submissionId}`;
  const lock = LockService.getScriptLock();

  lock.waitLock(5000);

  try {
    if (cache.get(sentKey) || cache.get(pendingKey)) {
      return "duplicate";
    }

    const minuteKey = `minute:${Utilities.formatDate(
      new Date(),
      "GMT",
      "yyyyMMddHHmm"
    )}`;
    const currentCount = Number(cache.get(minuteKey) || 0);

    if (currentCount >= MAX_SUBMISSIONS_PER_MINUTE) {
      throw new Error("Limite temporario de feedbacks atingido.");
    }

    reserveDailySubmission_();
    reserveContentFingerprint_(cache, parameters);
    cache.put(minuteKey, String(currentCount + 1), 120);
    cache.put(pendingKey, "1", 60);

    return "reserved";
  } finally {
    lock.releaseLock();
  }
}

function reserveDailySubmission_() {
  const properties = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), "GMT", "yyyyMMdd");
  let dailyCounter = {};

  try {
    dailyCounter = JSON.parse(
      properties.getProperty(DAILY_COUNTER_PROPERTY) || "{}"
    );
  } catch (error) {
    console.warn("Contador diario invalido; reiniciando:", error);
  }

  const currentCount = dailyCounter.date === today
    ? Number(dailyCounter.count) || 0
    : 0;

  if (currentCount >= MAX_SUBMISSIONS_PER_DAY) {
    throw new Error("Limite diario de feedbacks atingido.");
  }

  properties.setProperty(DAILY_COUNTER_PROPERTY, JSON.stringify({
    count: currentCount + 1,
    date: today
  }));
}

function reserveContentFingerprint_(cache, parameters) {
  const comparableContent = [
    cleanText_(parameters.motivo, 200).toLowerCase(),
    cleanText_(parameters.comentario, 1200).toLowerCase(),
    cleanText_(parameters.email, 254).toLowerCase(),
    cleanText_(parameters.navegador, 500)
  ].join("|");
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    comparableContent
  );
  const fingerprint = Utilities.base64EncodeWebSafe(digest).slice(0, 32);
  const fingerprintKey = `content:${fingerprint}`;
  const currentCount = Number(cache.get(fingerprintKey) || 0);

  if (currentCount >= MAX_IDENTICAL_SUBMISSIONS_PER_WINDOW) {
    throw new Error("Feedback repetido em excesso.");
  }

  cache.put(fingerprintKey, String(currentCount + 1), 21600);
}

function confirmSubmission_(submissionId) {
  const cache = CacheService.getScriptCache();

  cache.remove(`pending:${submissionId}`);
  cache.put(`sent:${submissionId}`, "1", 21600);
}

function releaseSubmission_(submissionId) {
  if (!submissionId) {
    return;
  }

  CacheService.getScriptCache().remove(`pending:${submissionId}`);
}

function sendFeedbackEmail_(parameters) {
  if (MailApp.getRemainingDailyQuota() < 1) {
    throw new Error("Cota diaria de e-mail esgotada.");
  }

  const feedback = {
    comentario: cleanText_(parameters.comentario, 1200)
      || "Nao informou detalhes adicionais.",
    data: cleanText_(parameters.data, 60),
    email: cleanText_(parameters.email, 254) || "Nao informado",
    idioma: cleanText_(parameters.idioma, 20),
    motivo: cleanText_(parameters.motivo, 200),
    navegador: cleanText_(parameters.navegador, 500),
    versao: cleanText_(parameters.versao, 30)
  };
  const message = {
    body: createPlainTextBody_(feedback),
    htmlBody: createHtmlBody_(feedback),
    name: "RecarregaAi!",
    subject: `Feedback RecarregaAi! ${feedback.versao}`,
    to: FEEDBACK_RECIPIENT
  };

  if (feedback.email !== "Nao informado") {
    message.replyTo = feedback.email;
  }

  MailApp.sendEmail(message);
}

function createPlainTextBody_(feedback) {
  return [
    `Motivo: ${feedback.motivo}`,
    `Comentario: ${feedback.comentario}`,
    `E-mail para contato: ${feedback.email}`,
    `Versao: ${feedback.versao}`,
    `Idioma: ${feedback.idioma}`,
    `Navegador: ${feedback.navegador}`,
    `Data: ${feedback.data}`
  ].join("\n");
}

function createHtmlBody_(feedback) {
  const rows = [
    ["Motivo", feedback.motivo],
    ["Comentario", feedback.comentario],
    ["E-mail para contato", feedback.email],
    ["Versao", feedback.versao],
    ["Idioma", feedback.idioma],
    ["Navegador", feedback.navegador],
    ["Data", feedback.data]
  ].map(([label, value]) => (
    `<tr><th style="padding:8px;text-align:left">${escapeHtml_(label)}</th>`
      + `<td style="padding:8px">${escapeHtml_(value)}</td></tr>`
  )).join("");

  return `<h2>Novo feedback do RecarregaAi!</h2>`
    + `<table style="border-collapse:collapse">${rows}</table>`;
}

function createResponse_(success, submissionId, message, responseOrigin) {
  const payload = JSON.stringify({
    message,
    source: FEEDBACK_RESPONSE_SOURCE,
    submissionId,
    success
  }).replace(/</g, "\\u003c");
  const targetOrigin = JSON.stringify(responseOrigin || FEEDBACK_PAGE_ORIGIN);
  const html = `<!doctype html><meta charset="UTF-8">`
    + `<script>window.top.postMessage(${payload},${targetOrigin});</script>`;

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function cleanText_(value, maximumLength) {
  return String(value || "").trim().slice(0, maximumLength);
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
