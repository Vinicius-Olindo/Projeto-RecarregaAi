// RecarregaAi! 2.3.9

import { initFloatingTools } from "./modules/floating-tools.js";
import { extendPageTranslations } from "./modules/extended-translations.js";
import {
  defaultLanguage,
  initLanguageDialog,
  loadLanguagePreference,
  saveLanguagePreference,
  normalizeLanguage
} from "./modules/language-dialog.js";
import {
  actionHistoryStatuses,
  actionHistoryTypes,
  defaultAppSettings,
  getPermissionPatternForOrigin,
  getUrlOrigin,
  normalizeOperatingHours,
  runtimeMessageTypes,
  storageKeys
} from "./modules/shared.js";
import {
  loadThemePreference,
  normalizeTheme,
  saveThemePreference,
  toggleThemePreference
} from "./modules/theme.js";

const optionsPreviewStorageKey = "recarregaAiOptionsPreviewSettings";
const optionsPageLanguageStorageKey = "recarregaAiPageLanguage";
const settingsExportType = "recarregaai-settings";
const settingsExportVersion = 2;
const historyPageSize = 5;

const optionsElements = {
  addSiteButton: document.querySelector("#add-site-button"),
  clearHistoryButton: document.querySelector("#clear-history-button"),
  closeOptionsButton: document.querySelector("#close-options-button"),
  collapseHistoryButton: document.querySelector("#collapse-history-button"),
  defaultIntervalInput: document.querySelector("#default-interval-input"),
  extensionVersion: document.querySelector("#extension-version"),
  exportSettingsButton: document.querySelector("#export-settings-button"),
  importSettingsButton: document.querySelector("#import-settings-button"),
  importSettingsInput: document.querySelector("#import-settings-input"),
  historyCount: document.querySelector("#history-count"),
  historyEmptyState: document.querySelector("#history-empty-state"),
  historyFilterButtons: document.querySelectorAll("[data-history-filter]"),
  historyList: document.querySelector("#history-list"),
  historyPagination: document.querySelector("#history-pagination"),
  historyVisibleCount: document.querySelector("#history-visible-count"),
  optionsStatus: document.querySelector("#options-status"),
  operatingHoursEnabled: document.querySelector("#operating-hours-enabled"),
  operatingHoursFields: document.querySelector("#operating-hours-fields"),
  operatingStartTime: document.querySelector("#operating-start-time"),
  operatingEndTime: document.querySelector("#operating-end-time"),
  operatingWeekdays: document.querySelectorAll("[name='operating-weekday']"),
  preserveScrollInput: document.querySelector("#preserve-scroll-input"),
  saveSettingsButton: document.querySelector("#save-settings-button"),
  showMoreHistoryButton: document.querySelector("#show-more-history-button"),
  siteFormAlert: document.querySelector("#site-form-alert"),
  siteFormAlertText: document.querySelector("#site-form-alert-text"),
  siteIntervalInput: document.querySelector("#site-interval-input"),
  siteOriginInput: document.querySelector("#site-origin-input"),
  sitesEmptyState: document.querySelector("#sites-empty-state"),
  sitesList: document.querySelector("#sites-list"),
  summaryDefaultInterval: document.querySelector("#summary-default-interval"),
  summarySitesCount: document.querySelector("#summary-sites-count"),
  themeToggleButton: document.querySelector("#theme-toggle-button"),
  themeToggleLabel: document.querySelector("#theme-toggle-label")
};

const optionsTranslations = extendPageTranslations({
  "pt-BR": {
    addSite: "Adicionar site",
    autoSitesLabel: "Sites automáticos",
    autoStartDescription:
      "Quando uma página desses sites abrir, o RecarregaAi! liga uma atualização separada para ela.",
    autoStartEyebrow: "Início automático",
    backToTop: "Voltar ao início",
    backupDescription:
      "Leve tempo padrão, sites automáticos, tema e idioma para outro navegador ou uma nova instalação.",
    backupEyebrow: "Portabilidade",
    backupExport: "Exportar configurações",
    backupExportDescription: "Baixe uma cópia das suas preferências.",
    backupImport: "Importar configurações",
    backupImportDescription: "Restaure preferências de um arquivo JSON.",
    backupNote:
      "Timers ativos por aba não entram no arquivo porque dependem das guias abertas neste navegador.",
    backupNoteWithHistory:
      "Timers ativos e o histórico local não entram no arquivo porque pertencem a esta instalação do navegador.",
    backupTitle: "Importar e exportar configurações",
    closeDialog: "Fechar",
    cleanupDescription:
      "Remove dados antigos do endereço aberto para buscar conteúdo novo.",
    cleanupTitle: "Limpeza do site",
    contactChannelsLabel: "Canais de contato",
    currentPageDescription:
      "Identifica a página atual para limpar dados e atualizar no tempo definido.",
    currentPageTitle: "Página escolhida",
    defaultIntervalInputLabel: "Intervalo em minutos",
    defaultIntervalPlaceholder: "Padrão",
    defaultTimeLabel: "Tempo padrão",
    documentTitle: "Configurações do RecarregaAi!",
    emptySitesDescription:
      "Adicione um endereço acima para o RecarregaAi! iniciar sozinho quando esse site abrir.",
    emptySitesStatus: "Lista vazia",
    emptySitesTitle: "Nenhum site automático cadastrado.",
    footerFeedback: "Feedback",
    footerDeveloper: "Desenvolvido por:",
    footerHome: "Início",
    footerLegal: "© RecarregaAi! 2.3.9. Todos os direitos reservados.",
    footerPrivacy: "Privacidade",
    formInvalidInterval: "Informe um intervalo padrão de pelo menos 1 minuto.",
    formInvalidOrigin: "Use um endereço http ou https.",
    formPermissionDenied:
      "Permissão negada. Autorize este site para usar o início automático.",
    formSiteAddError: "Não consegui adicionar o site.",
    formSiteDuplicate: "Este site já está na lista de início automático.",
    formSiteSaved: "Site salvo para iniciar automaticamente.",
    formSiteSaveError: "Erro ao salvar site.",
    formSiteRemoved: "Site removido.",
    formSiteRemoveError: "Erro ao remover site.",
    formSettingsError: "Erro ao salvar preferências.",
    formSettingsLoadError: "Erro ao carregar configurações.",
    formSettingsSaved: "Tempo padrão salvo.",
    formThemeError: "Erro ao alternar tema.",
    formExportError: "Erro ao exportar configurações.",
    formExported: "Configurações exportadas.",
    formImportError: "Erro ao importar configurações.",
    formImported: "Configurações importadas.",
    formImportInvalid: "Arquivo de configurações inválido.",
    formImportPermissionDenied:
      "Permissão negada. Autorize os sites importados para concluir a importação.",
    headerExit: "Sair",
    headerTitle: "Configurações",
    historyAutomaticRefresh: "Atualização automática",
    historyClear: "Limpar histórico",
    historyClearConfirm: "Confirmar limpeza",
    historyCleared: "Histórico limpo.",
    historyCountPlural: "{count} ações",
    historyCountSingular: "1 ação",
    historyDescription:
      "Acompanhe limpezas, atualizações automáticas e mudanças feitas nos timers deste navegador.",
    historyEmptyDescription:
      "As próximas atividades da extensão aparecerão aqui.",
    historyEmptyTitle: "Nenhuma ação registrada.",
    historyEyebrow: "Atividade local",
    historyFilterAll: "Todas",
    historyFilterLabel: "Filtrar histórico",
    historyFilterRefreshes: "Atualizações",
    historyFilterTimers: "Timers",
    historyInterval: "A cada {interval}",
    historyCollapse: "Mostrar menos",
    historyLimitNote:
      "São mantidas somente as 100 ações mais recentes, salvas localmente.",
    historyShowMore: "Mostrar mais",
    historyVisibleCount: "Mostrando {visible} de {total}",
    historyManualCleanup: "Limpeza manual",
    historyNavLabel: "Histórico",
    historyPauseManual: "Pausado pelo usuário",
    historyPauseMedia: "Pausado por mídia ativa",
    historyPauseNavigation: "Pausado após sair do site",
    historyPauseTyping: "Pausado durante a digitação",
    historyStatusError: "Falhou",
    historyStatusInfo: "Informação",
    historyStatusSuccess: "Concluído",
    historyStatusWarning: "Pausado",
    historyTimerPaused: "Timer pausado",
    historyTimerResumed: "Timer retomado",
    historyTimerStarted: "Timer iniciado",
    historyTimerStopped: "Timer removido",
    historyTitle: "Histórico de ações",
    historyUnknownSite: "Site não identificado",
    heroCardBody:
      "Tudo fica salvo localmente no navegador e pode ser ajustado quando seu fluxo mudar.",
    heroCardLabel: "Resumo rápido",
    heroCardBadge: "Pronto para personalizar",
    heroCardTitle: "Controle simples, por guia e por site.",
    introStatusLabel: "Configuração local",
    introStatusText: "Salva no navegador",
    languageDialogDescription:
      "Escolha o idioma preferido para navegar pelo RecarregaAi!.",
    languageDialogTitle: "Idioma",
    languageGridLabel: "Idiomas disponíveis",
    languageLabel: "Idioma",
    linksLabel: "Links finais",
    localControlLabel: "Controle local",
    localControlText: "Configurações salvas no navegador.",
    localPreferencesDescription:
      "Salva tema, tempo padrão e sites cadastrados no seu navegador.",
    localPreferencesTitle: "Preferências locais",
    minutePlural: "{count} minutos",
    minuteSingular: "1 minuto",
    navBackup: "Backup",
    navGeneral: "Geral",
    navPermissions: "Permissões",
    navSites: "Sites",
    pageDescription:
      "Ajuste o tempo padrão, organize sites de início automático e revise as permissões usadas pela extensão.",
    pageTitle: "Configurações do RecarregaAi!",
    permissionsDescription:
      "A extensão usa apenas o necessário para atualizar a página escolhida e salvar suas preferências localmente.",
    permissionsGridLabel: "Permissões usadas pela extensão",
    permissionsSummaryLabel: "Resumo das configurações",
    permissionsTitle: "Como o RecarregaAi! usa permissões",
    preferencesEyebrow: "Preferências",
    readySitesEmpty: "Nenhum site cadastrado",
    readySitesPlural: "{count} sites cadastrados",
    readySitesSingular: "1 site cadastrado",
    removeSite: "Remover",
    saveDefaultInterval: "Salvar tempo padrão",
    siteAddressHint: "Use o endereço principal do site.",
    siteAddressLabel: "Endereço do site",
    siteFormDescription:
      "Informe o endereço e escolha quando a página deve ser atualizada.",
    siteFormTitle: "Novo site automático",
    siteIntervalHint: "Deixe vazio para usar o tempo padrão.",
    siteIntervalLabel: "Tempo em minutos",
    siteListLabel: "Sites automáticos",
    siteMeta: "Atualiza a cada {interval}",
    sitesTitle: "Sites que iniciam sozinhos",
    settingsNavLabel: "Navegação das configurações",
    authorizedSitesDescription:
      "Pede permissão somente para os sites adicionados ao início automático.",
    authorizedSitesTitle: "Sites autorizados",
    quickActionsLabel: "Ações rápidas",
    themeDark: "Tema escuro",
    themeLight: "Tema claro",
    themeToDark: "Mudar para o tema escuro",
    themeToLight: "Mudar para o tema claro",
    timeDescription:
      "Esse tempo é usado quando você cria uma atualização automática sem informar um intervalo específico.",
    transparencyEyebrow: "Transparência"
  },
  en: {
    addSite: "Add site",
    autoSitesLabel: "Automatic sites",
    autoStartDescription:
      "When one of these sites opens, RecarregaAi! starts a separate refresh for it.",
    autoStartEyebrow: "Automatic start",
    backToTop: "Back to top",
    backupDescription:
      "Take default time, automatic sites, theme and language to another browser or a new installation.",
    backupEyebrow: "Portability",
    backupExport: "Export settings",
    backupExportDescription: "Download a copy of your preferences.",
    backupImport: "Import settings",
    backupImportDescription: "Restore preferences from a JSON file.",
    backupNote:
      "Active timers by tab are not included in the file because they depend on the tabs open in this browser.",
    backupNoteWithHistory:
      "Active timers and local history are not included because they belong to this browser installation.",
    backupTitle: "Import and export settings",
    closeDialog: "Close",
    cleanupDescription:
      "Removes old data from the open address to fetch fresh content.",
    cleanupTitle: "Site cleanup",
    contactChannelsLabel: "Contact channels",
    currentPageDescription:
      "Identifies the current page to clear data and refresh it on the chosen interval.",
    currentPageTitle: "Selected page",
    defaultIntervalInputLabel: "Interval in minutes",
    defaultIntervalPlaceholder: "Default",
    defaultTimeLabel: "Default time",
    documentTitle: "RecarregaAi! Settings",
    emptySitesDescription:
      "Add an address above so RecarregaAi! can start automatically when that site opens.",
    emptySitesStatus: "Empty list",
    emptySitesTitle: "No automatic site added.",
    footerFeedback: "Feedback",
    footerDeveloper: "Developed by:",
    footerHome: "Home",
    footerLegal: "© RecarregaAi! 2.3.9. All rights reserved.",
    footerPrivacy: "Privacy",
    formInvalidInterval: "Enter a default interval of at least 1 minute.",
    formInvalidOrigin: "Use an http or https address.",
    formPermissionDenied:
      "Permission denied. Allow this site to use automatic start.",
    formSiteAddError: "I could not add the site.",
    formSiteDuplicate: "This site is already in the automatic-start list.",
    formSiteSaved: "Site saved for automatic start.",
    formSiteSaveError: "Error saving site.",
    formSiteRemoved: "Site removed.",
    formSiteRemoveError: "Error removing site.",
    formSettingsError: "Error saving preferences.",
    formSettingsLoadError: "Error loading settings.",
    formSettingsSaved: "Default time saved.",
    formThemeError: "Error switching theme.",
    formExportError: "Error exporting settings.",
    formExported: "Settings exported.",
    formImportError: "Error importing settings.",
    formImported: "Settings imported.",
    formImportInvalid: "Invalid settings file.",
    formImportPermissionDenied:
      "Permission denied. Allow the imported sites to complete the import.",
    headerExit: "Exit",
    headerTitle: "Settings",
    historyAutomaticRefresh: "Automatic refresh",
    historyClear: "Clear history",
    historyClearConfirm: "Confirm clear",
    historyCleared: "History cleared.",
    historyCountPlural: "{count} actions",
    historyCountSingular: "1 action",
    historyDescription:
      "Review cleanups, automatic refreshes and timer changes made in this browser.",
    historyEmptyDescription: "The extension's next activities will appear here.",
    historyEmptyTitle: "No actions recorded.",
    historyEyebrow: "Local activity",
    historyFilterAll: "All",
    historyFilterLabel: "Filter history",
    historyFilterRefreshes: "Refreshes",
    historyFilterTimers: "Timers",
    historyInterval: "Every {interval}",
    historyCollapse: "Show less",
    historyLimitNote:
      "Only the 100 most recent actions are kept and stored locally.",
    historyShowMore: "Show more",
    historyVisibleCount: "Showing {visible} of {total}",
    historyManualCleanup: "Manual cleanup",
    historyNavLabel: "History",
    historyPauseManual: "Paused by the user",
    historyPauseMedia: "Paused for active media",
    historyPauseNavigation: "Paused after leaving the site",
    historyPauseTyping: "Paused while typing",
    historyStatusError: "Failed",
    historyStatusInfo: "Information",
    historyStatusSuccess: "Completed",
    historyStatusWarning: "Paused",
    historyTimerPaused: "Timer paused",
    historyTimerResumed: "Timer resumed",
    historyTimerStarted: "Timer started",
    historyTimerStopped: "Timer removed",
    historyTitle: "Action history",
    historyUnknownSite: "Unknown site",
    heroCardBody:
      "Everything is saved locally in the browser and can be adjusted whenever your flow changes.",
    heroCardLabel: "Quick summary",
    heroCardBadge: "Ready to personalize",
    heroCardTitle: "Simple control, by tab and by site.",
    introStatusLabel: "Local settings",
    introStatusText: "Saved in the browser",
    languageDialogDescription:
      "Choose your preferred language to browse RecarregaAi!.",
    languageDialogTitle: "Language",
    languageGridLabel: "Available languages",
    languageLabel: "Language",
    linksLabel: "Footer links",
    localControlLabel: "Local control",
    localControlText: "Settings saved in the browser.",
    localPreferencesDescription:
      "Saves theme, default time and registered sites in your browser.",
    localPreferencesTitle: "Local preferences",
    minutePlural: "{count} minutes",
    minuteSingular: "1 minute",
    navBackup: "Backup",
    navGeneral: "General",
    navPermissions: "Permissions",
    navSites: "Sites",
    pageDescription:
      "Adjust the default time, organize automatic-start sites and review the permissions used by the extension.",
    pageTitle: "RecarregaAi! settings",
    permissionsDescription:
      "The extension uses only what is necessary to refresh the selected page and save your preferences locally.",
    permissionsGridLabel: "Permissions used by the extension",
    permissionsSummaryLabel: "Settings summary",
    permissionsTitle: "How RecarregaAi! uses permissions",
    preferencesEyebrow: "Preferences",
    readySitesEmpty: "No site added",
    readySitesPlural: "{count} sites added",
    readySitesSingular: "1 site added",
    removeSite: "Remove",
    saveDefaultInterval: "Save default time",
    siteAddressHint: "Use the site's main address.",
    siteAddressLabel: "Site address",
    siteFormDescription:
      "Enter the address and choose when the page should refresh.",
    siteFormTitle: "New automatic site",
    siteIntervalHint: "Leave empty to use the default time.",
    siteIntervalLabel: "Time in minutes",
    siteListLabel: "Automatic sites",
    siteMeta: "Refreshes every {interval}",
    sitesTitle: "Sites that start automatically",
    settingsNavLabel: "Settings navigation",
    authorizedSitesDescription:
      "Requests permission only for sites added to automatic start.",
    authorizedSitesTitle: "Authorized sites",
    quickActionsLabel: "Quick actions",
    themeDark: "Dark theme",
    themeLight: "Light theme",
    themeToDark: "Switch to dark theme",
    themeToLight: "Switch to light theme",
    timeDescription:
      "This time is used when you create an automatic refresh without entering a specific interval.",
    transparencyEyebrow: "Transparency"
  },
  es: {
    addSite: "Agregar sitio",
    autoSitesLabel: "Sitios automáticos",
    autoStartDescription:
      "Cuando se abre una página de esos sitios, RecarregaAi! activa una actualización separada para ella.",
    autoStartEyebrow: "Inicio automático",
    backToTop: "Volver al inicio",
    backupDescription:
      "Lleva tiempo predeterminado, sitios automáticos, tema e idioma a otro navegador o una nueva instalación.",
    backupEyebrow: "Portabilidad",
    backupExport: "Exportar configuración",
    backupExportDescription: "Descarga una copia de tus preferencias.",
    backupImport: "Importar configuración",
    backupImportDescription: "Restaura preferencias desde un archivo JSON.",
    backupNote:
      "Los timers activos por pestaña no entran en el archivo porque dependen de las pestañas abiertas en este navegador.",
    backupNoteWithHistory:
      "Los temporizadores activos y el historial local no se incluyen porque pertenecen a esta instalación del navegador.",
    backupTitle: "Importar y exportar configuración",
    closeDialog: "Cerrar",
    cleanupDescription:
      "Elimina datos antiguos de la dirección abierta para buscar contenido nuevo.",
    cleanupTitle: "Limpieza del sitio",
    contactChannelsLabel: "Canales de contacto",
    currentPageDescription:
      "Identifica la página actual para limpiar datos y actualizarla en el intervalo definido.",
    currentPageTitle: "Página seleccionada",
    defaultIntervalInputLabel: "Intervalo en minutos",
    defaultIntervalPlaceholder: "Predeterminado",
    defaultTimeLabel: "Tiempo predeterminado",
    documentTitle: "Configuración de RecarregaAi!",
    emptySitesDescription:
      "Agrega una dirección arriba para que RecarregaAi! se inicie solo cuando ese sitio se abra.",
    emptySitesStatus: "Lista vacía",
    emptySitesTitle: "No hay sitios automáticos registrados.",
    footerFeedback: "Feedback",
    footerDeveloper: "Desarrollado por:",
    footerHome: "Inicio",
    footerLegal: "© RecarregaAi! 2.3.9. Todos los derechos reservados.",
    footerPrivacy: "Privacidad",
    formInvalidInterval: "Ingresa un intervalo predeterminado de al menos 1 minuto.",
    formInvalidOrigin: "Usa una dirección http o https.",
    formPermissionDenied:
      "Permiso denegado. Autoriza este sitio para usar el inicio automático.",
    formSiteAddError: "No pude agregar el sitio.",
    formSiteDuplicate: "Este sitio ya está en la lista de inicio automático.",
    formSiteSaved: "Sitio guardado para inicio automático.",
    formSiteSaveError: "Error al guardar el sitio.",
    formSiteRemoved: "Sitio eliminado.",
    formSiteRemoveError: "Error al eliminar el sitio.",
    formSettingsError: "Error al guardar las preferencias.",
    formSettingsLoadError: "Error al cargar la configuración.",
    formSettingsSaved: "Tiempo predeterminado guardado.",
    formThemeError: "Error al cambiar el tema.",
    formExportError: "Error al exportar la configuración.",
    formExported: "Configuración exportada.",
    formImportError: "Error al importar la configuración.",
    formImported: "Configuración importada.",
    formImportInvalid: "Archivo de configuración inválido.",
    formImportPermissionDenied:
      "Permiso denegado. Autoriza los sitios importados para concluir la importación.",
    headerExit: "Salir",
    headerTitle: "Configuración",
    historyAutomaticRefresh: "Actualización automática",
    historyClear: "Borrar historial",
    historyClearConfirm: "Confirmar borrado",
    historyCleared: "Historial borrado.",
    historyCountPlural: "{count} acciones",
    historyCountSingular: "1 acción",
    historyDescription:
      "Consulta limpiezas, actualizaciones automáticas y cambios de temporizadores realizados en este navegador.",
    historyEmptyDescription: "Las próximas actividades de la extensión aparecerán aquí.",
    historyEmptyTitle: "No hay acciones registradas.",
    historyEyebrow: "Actividad local",
    historyFilterAll: "Todas",
    historyFilterLabel: "Filtrar historial",
    historyFilterRefreshes: "Actualizaciones",
    historyFilterTimers: "Temporizadores",
    historyInterval: "Cada {interval}",
    historyCollapse: "Mostrar menos",
    historyLimitNote:
      "Solo se conservan las 100 acciones más recientes, guardadas localmente.",
    historyShowMore: "Mostrar más",
    historyVisibleCount: "Mostrando {visible} de {total}",
    historyManualCleanup: "Limpieza manual",
    historyNavLabel: "Historial",
    historyPauseManual: "Pausado por el usuario",
    historyPauseMedia: "Pausado por contenido multimedia activo",
    historyPauseNavigation: "Pausado al salir del sitio",
    historyPauseTyping: "Pausado mientras escribes",
    historyStatusError: "Falló",
    historyStatusInfo: "Información",
    historyStatusSuccess: "Completado",
    historyStatusWarning: "Pausado",
    historyTimerPaused: "Temporizador pausado",
    historyTimerResumed: "Temporizador reanudado",
    historyTimerStarted: "Temporizador iniciado",
    historyTimerStopped: "Temporizador eliminado",
    historyTitle: "Historial de acciones",
    historyUnknownSite: "Sitio no identificado",
    heroCardBody:
      "Todo queda guardado localmente en el navegador y puede ajustarse cuando tu flujo cambie.",
    heroCardLabel: "Resumen rápido",
    heroCardBadge: "Listo para personalizar",
    heroCardTitle: "Control simple, por pestaña y por sitio.",
    introStatusLabel: "Configuración local",
    introStatusText: "Guardada en el navegador",
    languageDialogDescription:
      "Elige el idioma preferido para navegar por RecarregaAi!.",
    languageDialogTitle: "Idioma",
    languageGridLabel: "Idiomas disponibles",
    languageLabel: "Idioma",
    linksLabel: "Enlaces finales",
    localControlLabel: "Control local",
    localControlText: "Configuración guardada en el navegador.",
    localPreferencesDescription:
      "Guarda tema, tiempo predeterminado y sitios registrados en tu navegador.",
    localPreferencesTitle: "Preferencias locales",
    minutePlural: "{count} minutos",
    minuteSingular: "1 minuto",
    navBackup: "Backup",
    navGeneral: "General",
    navPermissions: "Permisos",
    navSites: "Sitios",
    pageDescription:
      "Ajusta el tiempo predeterminado, organiza sitios de inicio automático y revisa los permisos usados por la extensión.",
    pageTitle: "Configuración de RecarregaAi!",
    permissionsDescription:
      "La extensión usa solo lo necesario para actualizar la página elegida y guardar tus preferencias localmente.",
    permissionsGridLabel: "Permisos usados por la extensión",
    permissionsSummaryLabel: "Resumen de la configuración",
    permissionsTitle: "Cómo RecarregaAi! usa permisos",
    preferencesEyebrow: "Preferencias",
    readySitesEmpty: "Ningún sitio registrado",
    readySitesPlural: "{count} sitios registrados",
    readySitesSingular: "1 sitio registrado",
    removeSite: "Eliminar",
    saveDefaultInterval: "Guardar tiempo predeterminado",
    siteAddressHint: "Usa la dirección principal del sitio.",
    siteAddressLabel: "Dirección del sitio",
    siteFormDescription:
      "Introduce la dirección y elige cuándo se debe actualizar la página.",
    siteFormTitle: "Nuevo sitio automático",
    siteIntervalHint: "Déjalo vacío para usar el tiempo predeterminado.",
    siteIntervalLabel: "Tiempo en minutos",
    siteListLabel: "Sitios automáticos",
    siteMeta: "Actualiza cada {interval}",
    sitesTitle: "Sitios que se inician solos",
    settingsNavLabel: "Navegación de la configuración",
    authorizedSitesDescription:
      "Solicita permiso solo para los sitios agregados al inicio automático.",
    authorizedSitesTitle: "Sitios autorizados",
    quickActionsLabel: "Acciones rápidas",
    themeDark: "Tema oscuro",
    themeLight: "Tema claro",
    themeToDark: "Cambiar al tema oscuro",
    themeToLight: "Cambiar al tema claro",
    timeDescription:
      "Este tiempo se usa cuando creas una actualización automática sin informar un intervalo específico.",
    transparencyEyebrow: "Transparencia"
  }
}, "options");

const settingsFeatureTranslations = {
  "pt-BR": {
    historyPauseGlobal: "Pausado pela pausa geral",
    historyPauseSchedule: "Pausado fora do horário de funcionamento",
    operatingDays: "Dias ativos",
    operatingDescription: "Limita o auto-início aos dias e horários escolhidos.",
    operatingEnd: "Fim",
    operatingStart: "Início",
    operatingTitle: "Horários de funcionamento",
    preserveScrollDescription: "Volta ao mesmo ponto após uma atualização automática.",
    preserveScrollTitle: "Preservar posição da página",
    weekdayShorts: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
  },
  en: {
    historyPauseGlobal: "Paused by the global pause",
    historyPauseSchedule: "Paused outside operating hours",
    operatingDays: "Active days",
    operatingDescription: "Limits automatic start to the selected days and times.",
    operatingEnd: "End",
    operatingStart: "Start",
    operatingTitle: "Operating hours",
    preserveScrollDescription: "Returns to the same point after an automatic refresh.",
    preserveScrollTitle: "Preserve page position",
    weekdayShorts: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  },
  es: {
    historyPauseGlobal: "Pausado por la pausa general",
    historyPauseSchedule: "Pausado fuera del horario de funcionamiento",
    operatingDays: "Días activos",
    operatingDescription: "Limita el inicio automático a los días y horarios elegidos.",
    operatingEnd: "Fin",
    operatingStart: "Inicio",
    operatingTitle: "Horario de funcionamiento",
    preserveScrollDescription: "Vuelve al mismo punto después de una actualización automática.",
    preserveScrollTitle: "Conservar la posición de la página",
    weekdayShorts: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  },
  fr: {
    historyPauseGlobal: "Mis en pause par la pause générale",
    historyPauseSchedule: "Mis en pause hors des heures de fonctionnement",
    operatingDays: "Jours actifs",
    operatingDescription: "Limite le démarrage automatique aux jours et horaires choisis.",
    operatingEnd: "Fin",
    operatingStart: "Début",
    operatingTitle: "Heures de fonctionnement",
    preserveScrollDescription: "Revient au même endroit après une actualisation automatique.",
    preserveScrollTitle: "Conserver la position de la page",
    weekdayShorts: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
  },
  de: {
    historyPauseGlobal: "Durch die globale Pause angehalten",
    historyPauseSchedule: "Außerhalb der Betriebszeiten angehalten",
    operatingDays: "Aktive Tage",
    operatingDescription: "Begrenzt den automatischen Start auf ausgewählte Tage und Zeiten.",
    operatingEnd: "Ende",
    operatingStart: "Start",
    operatingTitle: "Betriebszeiten",
    preserveScrollDescription: "Kehrt nach einer automatischen Aktualisierung zur gleichen Stelle zurück.",
    preserveScrollTitle: "Seitenposition beibehalten",
    weekdayShorts: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
  },
  it: {
    historyPauseGlobal: "Messo in pausa dalla pausa generale",
    historyPauseSchedule: "Messo in pausa fuori dall'orario di funzionamento",
    operatingDays: "Giorni attivi",
    operatingDescription: "Limita l'avvio automatico ai giorni e agli orari scelti.",
    operatingEnd: "Fine",
    operatingStart: "Inizio",
    operatingTitle: "Orari di funzionamento",
    preserveScrollDescription: "Torna allo stesso punto dopo un aggiornamento automatico.",
    preserveScrollTitle: "Mantieni la posizione della pagina",
    weekdayShorts: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
  },
  id: {
    historyPauseGlobal: "Dijeda oleh jeda global",
    historyPauseSchedule: "Dijeda di luar jam operasional",
    operatingDays: "Hari aktif",
    operatingDescription: "Membatasi mulai otomatis pada hari dan waktu yang dipilih.",
    operatingEnd: "Selesai",
    operatingStart: "Mulai",
    operatingTitle: "Jam operasional",
    preserveScrollDescription: "Kembali ke posisi yang sama setelah penyegaran otomatis.",
    preserveScrollTitle: "Pertahankan posisi halaman",
    weekdayShorts: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
  },
  tr: {
    historyPauseGlobal: "Genel duraklatma nedeniyle duraklatıldı",
    historyPauseSchedule: "Çalışma saatleri dışında duraklatıldı",
    operatingDays: "Etkin günler",
    operatingDescription: "Otomatik başlatmayı seçilen gün ve saatlerle sınırlar.",
    operatingEnd: "Bitiş",
    operatingStart: "Başlangıç",
    operatingTitle: "Çalışma saatleri",
    preserveScrollDescription: "Otomatik yenilemeden sonra aynı konuma döner.",
    preserveScrollTitle: "Sayfa konumunu koru",
    weekdayShorts: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
  }
};

Object.entries(settingsFeatureTranslations).forEach(([language, translations]) => {
  Object.assign(optionsTranslations[language], translations);
});

const localizedHistoryTranslations = {
  fr: {
    backupExportDescription: "Téléchargez une copie de vos préférences.",
    backupImportDescription: "Restaurez les préférences depuis un fichier JSON.",
    backupNoteWithHistory:
      "Les minuteurs actifs et l'historique local ne sont pas inclus, car ils appartiennent à cette installation du navigateur.",
    historyAutomaticRefresh: "Actualisation automatique",
    historyClear: "Effacer l'historique",
    historyClearConfirm: "Confirmer l'effacement",
    historyCleared: "Historique effacé.",
    historyCountPlural: "{count} actions",
    historyCountSingular: "1 action",
    historyDescription:
      "Consultez les nettoyages, les actualisations automatiques et les changements de minuteur effectués dans ce navigateur.",
    historyEmptyDescription: "Les prochaines activités de l'extension apparaîtront ici.",
    historyEmptyTitle: "Aucune action enregistrée.",
    historyEyebrow: "Activité locale",
    historyFilterAll: "Toutes",
    historyFilterLabel: "Filtrer l'historique",
    historyFilterRefreshes: "Actualisations",
    historyFilterTimers: "Minuteurs",
    historyInterval: "Toutes les {interval}",
    historyCollapse: "Afficher moins",
    historyLimitNote:
      "Seules les 100 actions les plus récentes sont conservées localement.",
    historyShowMore: "Afficher plus",
    historyVisibleCount: "Affichage de {visible} sur {total}",
    historyManualCleanup: "Nettoyage manuel",
    historyNavLabel: "Historique",
    historyPauseManual: "Mis en pause par l'utilisateur",
    historyPauseMedia: "Mis en pause pour un média actif",
    historyPauseNavigation: "Mis en pause après avoir quitté le site",
    historyPauseTyping: "Mis en pause pendant la saisie",
    historyStatusError: "Échec",
    historyStatusInfo: "Information",
    historyStatusSuccess: "Terminé",
    historyStatusWarning: "En pause",
    historyTimerPaused: "Minuteur en pause",
    historyTimerResumed: "Minuteur repris",
    historyTimerStarted: "Minuteur démarré",
    historyTimerStopped: "Minuteur supprimé",
    historyTitle: "Historique des actions",
    historyUnknownSite: "Site non identifié"
  },
  de: {
    backupExportDescription: "Laden Sie eine Kopie Ihrer Einstellungen herunter.",
    backupImportDescription: "Stellen Sie Einstellungen aus einer JSON-Datei wieder her.",
    backupNoteWithHistory:
      "Aktive Timer und der lokale Verlauf sind nicht enthalten, da sie zu dieser Browserinstallation gehören.",
    historyAutomaticRefresh: "Automatische Aktualisierung",
    historyClear: "Verlauf löschen",
    historyClearConfirm: "Löschen bestätigen",
    historyCleared: "Verlauf gelöscht.",
    historyCountPlural: "{count} Aktionen",
    historyCountSingular: "1 Aktion",
    historyDescription:
      "Überprüfen Sie Bereinigungen, automatische Aktualisierungen und Timer-Änderungen in diesem Browser.",
    historyEmptyDescription: "Die nächsten Aktivitäten der Erweiterung erscheinen hier.",
    historyEmptyTitle: "Keine Aktionen aufgezeichnet.",
    historyEyebrow: "Lokale Aktivität",
    historyFilterAll: "Alle",
    historyFilterLabel: "Verlauf filtern",
    historyFilterRefreshes: "Aktualisierungen",
    historyFilterTimers: "Timer",
    historyInterval: "Alle {interval}",
    historyCollapse: "Weniger anzeigen",
    historyLimitNote:
      "Nur die 100 neuesten Aktionen werden lokal gespeichert.",
    historyShowMore: "Mehr anzeigen",
    historyVisibleCount: "{visible} von {total} werden angezeigt",
    historyManualCleanup: "Manuelle Bereinigung",
    historyNavLabel: "Verlauf",
    historyPauseManual: "Vom Benutzer pausiert",
    historyPauseMedia: "Wegen aktiver Medien pausiert",
    historyPauseNavigation: "Nach Verlassen der Website pausiert",
    historyPauseTyping: "Während der Eingabe pausiert",
    historyStatusError: "Fehlgeschlagen",
    historyStatusInfo: "Information",
    historyStatusSuccess: "Abgeschlossen",
    historyStatusWarning: "Pausiert",
    historyTimerPaused: "Timer pausiert",
    historyTimerResumed: "Timer fortgesetzt",
    historyTimerStarted: "Timer gestartet",
    historyTimerStopped: "Timer entfernt",
    historyTitle: "Aktionsverlauf",
    historyUnknownSite: "Unbekannte Website"
  },
  it: {
    backupExportDescription: "Scarica una copia delle tue preferenze.",
    backupImportDescription: "Ripristina le preferenze da un file JSON.",
    backupNoteWithHistory:
      "I timer attivi e la cronologia locale non sono inclusi perché appartengono a questa installazione del browser.",
    historyAutomaticRefresh: "Aggiornamento automatico",
    historyClear: "Cancella cronologia",
    historyClearConfirm: "Conferma cancellazione",
    historyCleared: "Cronologia cancellata.",
    historyCountPlural: "{count} azioni",
    historyCountSingular: "1 azione",
    historyDescription:
      "Controlla le pulizie, gli aggiornamenti automatici e le modifiche ai timer effettuate in questo browser.",
    historyEmptyDescription: "Le prossime attività dell'estensione appariranno qui.",
    historyEmptyTitle: "Nessuna azione registrata.",
    historyEyebrow: "Attività locale",
    historyFilterAll: "Tutte",
    historyFilterLabel: "Filtra cronologia",
    historyFilterRefreshes: "Aggiornamenti",
    historyFilterTimers: "Timer",
    historyInterval: "Ogni {interval}",
    historyCollapse: "Mostra meno",
    historyLimitNote:
      "Solo le 100 azioni più recenti vengono conservate localmente.",
    historyShowMore: "Mostra altro",
    historyVisibleCount: "Visualizzazione di {visible} su {total}",
    historyManualCleanup: "Pulizia manuale",
    historyNavLabel: "Cronologia",
    historyPauseManual: "Messo in pausa dall'utente",
    historyPauseMedia: "Messo in pausa per contenuti multimediali attivi",
    historyPauseNavigation: "Messo in pausa dopo aver lasciato il sito",
    historyPauseTyping: "Messo in pausa durante la digitazione",
    historyStatusError: "Non riuscito",
    historyStatusInfo: "Informazione",
    historyStatusSuccess: "Completato",
    historyStatusWarning: "In pausa",
    historyTimerPaused: "Timer in pausa",
    historyTimerResumed: "Timer ripreso",
    historyTimerStarted: "Timer avviato",
    historyTimerStopped: "Timer rimosso",
    historyTitle: "Cronologia delle azioni",
    historyUnknownSite: "Sito non identificato"
  },
  id: {
    backupExportDescription: "Unduh salinan preferensi Anda.",
    backupImportDescription: "Pulihkan preferensi dari file JSON.",
    backupNoteWithHistory:
      "Pengatur waktu aktif dan riwayat lokal tidak disertakan karena terkait dengan pemasangan browser ini.",
    historyAutomaticRefresh: "Penyegaran otomatis",
    historyClear: "Hapus riwayat",
    historyClearConfirm: "Konfirmasi penghapusan",
    historyCleared: "Riwayat dihapus.",
    historyCountPlural: "{count} tindakan",
    historyCountSingular: "1 tindakan",
    historyDescription:
      "Tinjau pembersihan, penyegaran otomatis, dan perubahan pengatur waktu di browser ini.",
    historyEmptyDescription: "Aktivitas ekstensi berikutnya akan muncul di sini.",
    historyEmptyTitle: "Belum ada tindakan yang tercatat.",
    historyEyebrow: "Aktivitas lokal",
    historyFilterAll: "Semua",
    historyFilterLabel: "Filter riwayat",
    historyFilterRefreshes: "Penyegaran",
    historyFilterTimers: "Pengatur waktu",
    historyInterval: "Setiap {interval}",
    historyCollapse: "Tampilkan lebih sedikit",
    historyLimitNote:
      "Hanya 100 tindakan terbaru yang disimpan secara lokal.",
    historyShowMore: "Tampilkan lebih banyak",
    historyVisibleCount: "Menampilkan {visible} dari {total}",
    historyManualCleanup: "Pembersihan manual",
    historyNavLabel: "Riwayat",
    historyPauseManual: "Dijeda oleh pengguna",
    historyPauseMedia: "Dijeda karena media aktif",
    historyPauseNavigation: "Dijeda setelah meninggalkan situs",
    historyPauseTyping: "Dijeda saat mengetik",
    historyStatusError: "Gagal",
    historyStatusInfo: "Informasi",
    historyStatusSuccess: "Selesai",
    historyStatusWarning: "Dijeda",
    historyTimerPaused: "Pengatur waktu dijeda",
    historyTimerResumed: "Pengatur waktu dilanjutkan",
    historyTimerStarted: "Pengatur waktu dimulai",
    historyTimerStopped: "Pengatur waktu dihapus",
    historyTitle: "Riwayat tindakan",
    historyUnknownSite: "Situs tidak dikenal"
  },
  tr: {
    backupExportDescription: "Tercihlerinizin bir kopyasını indirin.",
    backupImportDescription: "Tercihleri bir JSON dosyasından geri yükleyin.",
    backupNoteWithHistory:
      "Etkin zamanlayıcılar ve yerel geçmiş bu tarayıcı kurulumuna ait olduğundan dahil edilmez.",
    historyAutomaticRefresh: "Otomatik yenileme",
    historyClear: "Geçmişi temizle",
    historyClearConfirm: "Temizlemeyi onayla",
    historyCleared: "Geçmiş temizlendi.",
    historyCountPlural: "{count} işlem",
    historyCountSingular: "1 işlem",
    historyDescription:
      "Bu tarayıcıdaki temizlemeleri, otomatik yenilemeleri ve zamanlayıcı değişikliklerini inceleyin.",
    historyEmptyDescription: "Uzantının sonraki etkinlikleri burada görünecek.",
    historyEmptyTitle: "Kaydedilmiş işlem yok.",
    historyEyebrow: "Yerel etkinlik",
    historyFilterAll: "Tümü",
    historyFilterLabel: "Geçmişi filtrele",
    historyFilterRefreshes: "Yenilemeler",
    historyFilterTimers: "Zamanlayıcılar",
    historyInterval: "Her {interval}",
    historyCollapse: "Daha az göster",
    historyLimitNote:
      "Yalnızca en son 100 işlem yerel olarak saklanır.",
    historyShowMore: "Daha fazla göster",
    historyVisibleCount: "{total} kaydın {visible} tanesi gösteriliyor",
    historyManualCleanup: "Elle temizleme",
    historyNavLabel: "Geçmiş",
    historyPauseManual: "Kullanıcı tarafından duraklatıldı",
    historyPauseMedia: "Etkin medya nedeniyle duraklatıldı",
    historyPauseNavigation: "Siteden ayrıldıktan sonra duraklatıldı",
    historyPauseTyping: "Yazarken duraklatıldı",
    historyStatusError: "Başarısız",
    historyStatusInfo: "Bilgi",
    historyStatusSuccess: "Tamamlandı",
    historyStatusWarning: "Duraklatıldı",
    historyTimerPaused: "Zamanlayıcı duraklatıldı",
    historyTimerResumed: "Zamanlayıcı sürdürüldü",
    historyTimerStarted: "Zamanlayıcı başlatıldı",
    historyTimerStopped: "Zamanlayıcı kaldırıldı",
    historyTitle: "İşlem geçmişi",
    historyUnknownSite: "Bilinmeyen site"
  }
};

Object.entries(localizedHistoryTranslations).forEach(([language, translations]) => {
  Object.assign(optionsTranslations[language], translations);
});

let currentSettings = { ...defaultAppSettings };
let currentActionHistory = [];
let activeOptionsLanguage = defaultLanguage;
let activeHistoryFilter = "all";
let visibleHistoryLimit = historyPageSize;
let historyClearResetTimerId = null;
let isHistoryClearPending = false;
let optionsLanguageDialog = null;

const getOptionsCopy = (key) => (
  optionsTranslations[activeOptionsLanguage]?.[key]
  || optionsTranslations[defaultLanguage][key]
  || key
);

const replaceOptionsToken = (key, replacements) => (
  Object.entries(replacements).reduce(
    (text, [token, value]) => text.replace(`{${token}}`, value),
    getOptionsCopy(key)
  )
);

const sendOptionsRuntimeMessage = (message) => new Promise((resolve, reject) => {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    resolve({
      entries: [],
      ok: true
    });
    return;
  }

  chrome.runtime.sendMessage(message, (response) => {
    const runtimeError = chrome.runtime.lastError;

    if (runtimeError) {
      reject(new Error(runtimeError.message));
      return;
    }

    if (response?.ok === false) {
      reject(new Error(response.error));
      return;
    }

    resolve(response);
  });
});

const historyRefreshTypes = new Set([
  actionHistoryTypes.automaticRefresh,
  actionHistoryTypes.manualCleanup
]);

const historyTimerTypes = new Set([
  actionHistoryTypes.timerPaused,
  actionHistoryTypes.timerResumed,
  actionHistoryTypes.timerStarted,
  actionHistoryTypes.timerStopped
]);

const historyTitleKeys = Object.freeze({
  [actionHistoryTypes.automaticRefresh]: "historyAutomaticRefresh",
  [actionHistoryTypes.manualCleanup]: "historyManualCleanup",
  [actionHistoryTypes.timerPaused]: "historyTimerPaused",
  [actionHistoryTypes.timerResumed]: "historyTimerResumed",
  [actionHistoryTypes.timerStarted]: "historyTimerStarted",
  [actionHistoryTypes.timerStopped]: "historyTimerStopped"
});

const historyStatusKeys = Object.freeze({
  [actionHistoryStatuses.error]: "historyStatusError",
  [actionHistoryStatuses.info]: "historyStatusInfo",
  [actionHistoryStatuses.success]: "historyStatusSuccess",
  [actionHistoryStatuses.warning]: "historyStatusWarning"
});

const historyPauseKeys = Object.freeze({
  global: "historyPauseGlobal",
  manual: "historyPauseManual",
  media: "historyPauseMedia",
  navigation: "historyPauseNavigation",
  schedule: "historyPauseSchedule",
  typing: "historyPauseTyping"
});

const getHistoryEntryGroup = (entry) => (
  historyRefreshTypes.has(entry.type) ? "refresh" : "timer"
);

const getFilteredActionHistory = () => {
  if (activeHistoryFilter === "refresh") {
    return currentActionHistory.filter((entry) => historyRefreshTypes.has(entry.type));
  }

  if (activeHistoryFilter === "timer") {
    return currentActionHistory.filter((entry) => historyTimerTypes.has(entry.type));
  }

  return currentActionHistory;
};

const getHistoryOriginLabel = (origin) => {
  try {
    return new URL(origin).hostname || getOptionsCopy("historyUnknownSite");
  } catch {
    return getOptionsCopy("historyUnknownSite");
  }
};

const formatHistoryDate = (createdAt) => {
  const createdAtDate = new Date(createdAt);

  if (!Number.isFinite(createdAtDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(activeOptionsLanguage, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(createdAtDate);
};

const createHistoryIcon = (group) => {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const paths = group === "refresh"
    ? [
      "M20 7v5h-5",
      "M4 17v-5h5",
      "M6.1 8.5A7 7 0 0 1 18.7 7L20 12",
      "M4 12l1.3 5A7 7 0 0 0 17.9 15.5"
    ]
    : [
      "M4 12a8 8 0 1 0 2.3-5.7",
      "M4 4v5h5",
      "M12 8v5l3 2"
    ];

  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");

  paths.forEach((pathData) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.setAttribute("d", pathData);
    icon.append(path);
  });

  return icon;
};

const getHistoryDetails = (entry) => {
  const details = [getHistoryOriginLabel(entry.origin)];

  if (entry.intervalInMinutes) {
    details.push(replaceOptionsToken("historyInterval", {
      interval: formatMinuteLabel(entry.intervalInMinutes)
    }));
  }

  if (entry.type === actionHistoryTypes.timerPaused && historyPauseKeys[entry.detail]) {
    details.push(getOptionsCopy(historyPauseKeys[entry.detail]));
  }

  return details;
};

const updateHistoryCount = () => {
  const count = currentActionHistory.length;

  optionsElements.historyCount.textContent = count === 1
    ? getOptionsCopy("historyCountSingular")
    : replaceOptionsToken("historyCountPlural", {
      count
    });
  optionsElements.clearHistoryButton.disabled = count === 0;
};

const updateHistoryPagination = (totalCount, visibleCount) => {
  const hasPagination = totalCount > historyPageSize;

  optionsElements.historyPagination.hidden = !hasPagination;
  optionsElements.historyVisibleCount.textContent = replaceOptionsToken(
    "historyVisibleCount",
    {
      total: String(totalCount),
      visible: String(visibleCount)
    }
  );
  optionsElements.showMoreHistoryButton.hidden = visibleCount >= totalCount;
  optionsElements.collapseHistoryButton.hidden =
    visibleCount <= historyPageSize;
};

const renderActionHistory = () => {
  const filteredHistory = getFilteredActionHistory();
  const visibleHistory = filteredHistory.slice(0, visibleHistoryLimit);

  optionsElements.historyList.replaceChildren();
  optionsElements.historyList.hidden = filteredHistory.length === 0;
  optionsElements.historyEmptyState.hidden = filteredHistory.length > 0;

  visibleHistory.forEach((entry) => {
    const item = document.createElement("li");
    const icon = document.createElement("span");
    const content = document.createElement("div");
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    const status = document.createElement("span");
    const details = document.createElement("p");
    const time = document.createElement("time");
    const historyGroup = getHistoryEntryGroup(entry);

    item.className = "history-item";
    item.dataset.historyGroup = historyGroup;
    icon.className = "history-item__icon";
    icon.append(createHistoryIcon(historyGroup));
    content.className = "history-item__content";
    heading.className = "history-item__heading";
    title.textContent = getOptionsCopy(historyTitleKeys[entry.type]);
    status.className = "history-item__status";
    status.dataset.status = entry.status;
    status.textContent = getOptionsCopy(
      historyStatusKeys[entry.status] || "historyStatusInfo"
    );
    details.className = "history-item__details";
    details.textContent = getHistoryDetails(entry).join(" · ");
    time.className = "history-item__time";
    time.dateTime = entry.createdAt;
    time.textContent = formatHistoryDate(entry.createdAt);

    heading.append(title, status);
    content.append(heading, details, time);
    item.append(icon, content);
    optionsElements.historyList.append(item);
  });

  updateHistoryCount();
  updateHistoryPagination(filteredHistory.length, visibleHistory.length);
};

const loadActionHistory = async () => {
  const response = await sendOptionsRuntimeMessage({
    type: runtimeMessageTypes.getActionHistory
  });

  currentActionHistory = Array.isArray(response?.entries) ? response.entries : [];
  visibleHistoryLimit = historyPageSize;
  renderActionHistory();
};

const resetHistoryClearConfirmation = () => {
  isHistoryClearPending = false;
  optionsElements.clearHistoryButton.classList.remove("is-confirming");
  optionsElements.clearHistoryButton.textContent = getOptionsCopy("historyClear");

  if (historyClearResetTimerId) {
    window.clearTimeout(historyClearResetTimerId);
    historyClearResetTimerId = null;
  }
};

const clearStoredActionHistory = async () => {
  if (!isHistoryClearPending) {
    isHistoryClearPending = true;
    optionsElements.clearHistoryButton.classList.add("is-confirming");
    optionsElements.clearHistoryButton.textContent = getOptionsCopy(
      "historyClearConfirm"
    );
    historyClearResetTimerId = window.setTimeout(
      resetHistoryClearConfirmation,
      5000
    );
    return;
  }

  await sendOptionsRuntimeMessage({
    type: runtimeMessageTypes.clearActionHistory
  });
  currentActionHistory = [];
  visibleHistoryLimit = historyPageSize;
  resetHistoryClearConfirmation();
  renderActionHistory();
  updateOptionsStatus(getOptionsCopy("historyCleared"), "success");
};

const setText = (selector, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = getOptionsCopy(key);
  }
};

const setTexts = (selector, keys) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    const key = keys[index];

    if (key) {
      element.textContent = getOptionsCopy(key);
    }
  });
};

const setTextAt = (selector, index, key) => {
  const element = document.querySelectorAll(selector)[index];

  if (element) {
    element.textContent = getOptionsCopy(key);
  }
};

const setAttribute = (selector, attribute, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute(attribute, getOptionsCopy(key));
  }
};

const getOptionsStorageArea = () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
};

const getPreviewSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(optionsPreviewStorageKey)) || {};
  } catch {
    return {};
  }
};

const savePreviewSettings = (settings) => {
  localStorage.setItem(optionsPreviewStorageKey, JSON.stringify(settings));
};

const updateOptionsStatus = (message, status = "neutral") => {
  optionsElements.optionsStatus.textContent = message;
  optionsElements.optionsStatus.dataset.status = status;
};

const updateSiteFormAlert = (message = "") => {
  optionsElements.siteFormAlertText.textContent = message;
  optionsElements.siteFormAlert.hidden = !message;
};

const closeOptionsPage = () => {
  if (typeof chrome === "undefined" || !chrome.tabs?.getCurrent || !chrome.tabs?.remove) {
    window.close();
    return;
  }

  chrome.tabs.getCurrent((currentTab) => {
    if (chrome.runtime.lastError || !currentTab?.id) {
      window.close();
      return;
    }

    chrome.tabs.remove(currentTab.id);
  });
};

const formatMinuteLabel = (minutes) => {
  if (minutes === 1) {
    return getOptionsCopy("minuteSingular");
  }

  return replaceOptionsToken("minutePlural", {
    count: String(minutes)
  });
};

const formatSiteCount = (count) => {
  if (count === 0) {
    return getOptionsCopy("readySitesEmpty");
  }

  if (count === 1) {
    return getOptionsCopy("readySitesSingular");
  }

  return replaceOptionsToken("readySitesPlural", {
    count: String(count)
  });
};

const updateSettingsSummary = () => {
  optionsElements.summaryDefaultInterval.textContent = formatMinuteLabel(
    currentSettings.defaultIntervalInMinutes
  );
  optionsElements.summarySitesCount.textContent = formatSiteCount(
    currentSettings.autoStartSites.length
  );
};

const getStoredOptionsSettings = async () => {
  const storageArea = getOptionsStorageArea();
  const storedData = storageArea
    ? await storageArea.get(storageKeys.appSettings)
    : {
      [storageKeys.appSettings]: getPreviewSettings()
    };
  const storedSettings = storedData[storageKeys.appSettings] || {};

  return {
    ...defaultAppSettings,
    ...storedSettings,
    autoStartSites: Array.isArray(storedSettings.autoStartSites)
      ? storedSettings.autoStartSites
      : [],
    operatingHours: normalizeOperatingHours(storedSettings.operatingHours),
    preserveScrollPosition: Boolean(storedSettings.preserveScrollPosition)
  };
};

const saveOptionsSettings = async () => {
  const storageArea = getOptionsStorageArea();

  if (!storageArea) {
    savePreviewSettings(currentSettings);
    return;
  }

  await storageArea.set({
    [storageKeys.appSettings]: currentSettings
  });
};

const hasOwnProperty = (object, property) => (
  Object.prototype.hasOwnProperty.call(object, property)
);

const normalizeOptionsInterval = (
  interval,
  fallback = defaultAppSettings.defaultIntervalInMinutes
) => {
  const intervalInMinutes = Number(interval);

  if (!Number.isFinite(intervalInMinutes) || intervalInMinutes < 1) {
    return fallback;
  }

  return Math.floor(intervalInMinutes);
};

const normalizeAutoStartSite = (site, fallbackInterval) => {
  const origin = getUrlOrigin(site?.origin);

  if (!origin) {
    return null;
  }

  return {
    enabled: site.enabled !== false,
    intervalInMinutes: normalizeOptionsInterval(
      site.intervalInMinutes,
      fallbackInterval
    ),
    origin
  };
};

const normalizeOptionsSettings = (settings) => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  if (
    !hasOwnProperty(settings, "defaultIntervalInMinutes")
    && !hasOwnProperty(settings, "autoStartSites")
  ) {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  if (
    hasOwnProperty(settings, "autoStartSites")
    && !Array.isArray(settings.autoStartSites)
  ) {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  const defaultIntervalInMinutes = normalizeOptionsInterval(
    settings.defaultIntervalInMinutes
  );
  const siteMap = new Map();

  (settings.autoStartSites || []).forEach((site) => {
    const normalizedSite = normalizeAutoStartSite(
      site,
      defaultIntervalInMinutes
    );

    if (normalizedSite) {
      siteMap.set(normalizedSite.origin, normalizedSite);
    }
  });

  return {
    autoStartSites: [...siteMap.values()],
    defaultIntervalInMinutes,
    operatingHours: normalizeOperatingHours(settings.operatingHours),
    preserveScrollPosition: Boolean(settings.preserveScrollPosition)
  };
};

const getOptionsVersionLabel = () => {
  if (typeof chrome === "undefined" || !chrome.runtime?.getManifest) {
    return "preview";
  }

  const manifest = chrome.runtime.getManifest();

  return manifest.version_name || manifest.version;
};

const getCurrentOptionsLanguage = () => (
  normalizeLanguage(
    localStorage.getItem(optionsPageLanguageStorageKey)
    || document.documentElement.lang
  )
);

const getCurrentOptionsTheme = () => (
  normalizeTheme(document.documentElement.dataset.theme)
);

const createSettingsExportPayload = () => ({
  app: "RecarregaAi!",
  exportedAt: new Date().toISOString(),
  extensionVersion: getOptionsVersionLabel(),
  preferences: {
    language: getCurrentOptionsLanguage(),
    theme: getCurrentOptionsTheme()
  },
  settings: normalizeOptionsSettings(currentSettings),
  type: settingsExportType,
  version: settingsExportVersion
});

const downloadJsonFile = (fileName, payload) => {
  const downloadUrl = URL.createObjectURL(
    new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json"
    })
  );
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.hidden = true;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 0);
};

const exportOptionsSettings = () => {
  const exportDate = new Date().toISOString().slice(0, 10);
  const fileName = `recarregaai-configuracoes-${exportDate}.json`;

  downloadJsonFile(fileName, createSettingsExportPayload());
  updateOptionsStatus(getOptionsCopy("formExported"), "success");
};

const parseSettingsImportPayload = (fileText) => {
  let payload;

  try {
    payload = JSON.parse(fileText);
  } catch {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  const isWrappedPayload = payload.type === settingsExportType
    || hasOwnProperty(payload, "settings")
    || hasOwnProperty(payload, "preferences");
  const settings = normalizeOptionsSettings(
    isWrappedPayload ? payload.settings : payload
  );
  const preferences = isWrappedPayload && payload.preferences
    && typeof payload.preferences === "object"
    && !Array.isArray(payload.preferences)
    ? payload.preferences
    : {};

  return {
    preferences: {
      language: hasOwnProperty(preferences, "language")
        ? normalizeLanguage(preferences.language)
        : null,
      theme: hasOwnProperty(preferences, "theme")
        ? normalizeTheme(preferences.theme)
        : null
    },
    settings
  };
};

const requestAutoStartPermissions = async (autoStartSites) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.request) {
    return true;
  }

  const origins = [...new Set(
    autoStartSites
      .filter((site) => site.enabled !== false)
      .map((site) => getPermissionPatternForOrigin(site.origin))
  )];

  if (origins.length === 0) {
    return true;
  }

  return chrome.permissions.request({
    origins
  });
};

const removeUnusedAutoStartPermissions = async (
  previousAutoStartSites,
  nextAutoStartSites
) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.remove) {
    return;
  }

  const nextOrigins = new Set(nextAutoStartSites.map((site) => site.origin));
  const previousOrigins = [...new Set(
    previousAutoStartSites.map((site) => site.origin)
  )];
  const originsToRemove = previousOrigins.filter((origin) => (
    !nextOrigins.has(origin)
  ));

  await Promise.all(originsToRemove.map(async (origin) => {
    try {
      await chrome.permissions.remove({
        origins: [getPermissionPatternForOrigin(origin)]
      });
    } catch (error) {
      console.debug("Permissão antiga mantida pelo navegador:", error);
    }
  }));
};

const applyImportedPreferences = async (preferences) => {
  if (preferences.theme) {
    await saveThemePreference({
      onChange: updateOptionsThemeButtonLabel,
      theme: preferences.theme
    });
  }

  if (!preferences.language) {
    return;
  }

  if (optionsLanguageDialog) {
    optionsLanguageDialog.applyLanguage(preferences.language);
    return;
  }

  localStorage.setItem(optionsPageLanguageStorageKey, preferences.language);
  applyOptionsLanguage(preferences.language);
};

const importOptionsSettingsFromFile = async (file) => {
  if (!file) {
    return;
  }

  const importedData = parseSettingsImportPayload(await file.text());
  const hasPermission = await requestAutoStartPermissions(
    importedData.settings.autoStartSites
  );

  if (!hasPermission) {
    throw new Error(getOptionsCopy("formImportPermissionDenied"));
  }

  const previousSettings = currentSettings;

  currentSettings = importedData.settings;

  try {
    await saveOptionsSettings();
    await removeUnusedAutoStartPermissions(
      previousSettings.autoStartSites,
      currentSettings.autoStartSites
    );
    await applyImportedPreferences(importedData.preferences);
  } catch (error) {
    currentSettings = previousSettings;
    throw error;
  }

  optionsElements.defaultIntervalInput.value =
    currentSettings.defaultIntervalInMinutes;
  syncPreferenceControls();
  renderSites();
  updateOptionsStatus(getOptionsCopy("formImported"), "success");
};

const requestAutoStartPermission = async (origin) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.request) {
    return true;
  }

  const originPattern = getPermissionPatternForOrigin(origin);

  return chrome.permissions.request({
    origins: [originPattern]
  });
};

const removeAutoStartPermissionIfUnused = async (origin) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.remove) {
    return;
  }

  const originPattern = getPermissionPatternForOrigin(origin);
  const isStillUsed = currentSettings.autoStartSites.some((site) => (
    site.origin === origin
  ));

  if (isStillUsed) {
    return;
  }

  await chrome.permissions.remove({
    origins: [originPattern]
  });
};

const normalizeSiteOrigin = (inputValue) => {
  const trimmedValue = inputValue.trim();
  const urlValue = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
  const url = new URL(urlValue);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(getOptionsCopy("formInvalidOrigin"));
  }

  return url.origin;
};

const renderSites = () => {
  optionsElements.sitesList.innerHTML = "";

  const hasSites = currentSettings.autoStartSites.length > 0;

  optionsElements.sitesEmptyState.hidden = hasSites;
  optionsElements.sitesList.hidden = !hasSites;

  currentSettings.autoStartSites.forEach((site, index) => {
    const item = document.createElement("li");
    const info = document.createElement("span");
    const origin = document.createElement("span");
    const meta = document.createElement("span");
    const removeButton = document.createElement("button");

    item.className = "site-list__item";
    info.className = "site-list__info";
    origin.className = "site-list__origin";
    meta.className = "site-list__meta";
    removeButton.className = "button button--danger";
    removeButton.type = "button";
    removeButton.dataset.removeIndex = String(index);

    origin.textContent = site.origin;
    meta.textContent = replaceOptionsToken("siteMeta", {
      interval: formatMinuteLabel(site.intervalInMinutes)
    });
    removeButton.textContent = getOptionsCopy("removeSite");

    info.append(origin, meta);
    item.append(info, removeButton);
    optionsElements.sitesList.append(item);
  });

  updateSettingsSummary();
};

const syncPreferenceControls = () => {
  const operatingHours = normalizeOperatingHours(currentSettings.operatingHours);
  const isEnabled = operatingHours.enabled;

  currentSettings.operatingHours = operatingHours;
  optionsElements.preserveScrollInput.checked = Boolean(
    currentSettings.preserveScrollPosition
  );
  optionsElements.operatingHoursEnabled.checked = isEnabled;
  optionsElements.operatingStartTime.value = operatingHours.startTime;
  optionsElements.operatingEndTime.value = operatingHours.endTime;
  optionsElements.operatingHoursFields.dataset.enabled = String(isEnabled);

  optionsElements.operatingWeekdays.forEach((weekdayInput) => {
    weekdayInput.checked = operatingHours.weekdays.includes(
      Number(weekdayInput.value)
    );
    weekdayInput.disabled = !isEnabled;
  });

  optionsElements.operatingStartTime.disabled = !isEnabled;
  optionsElements.operatingEndTime.disabled = !isEnabled;
};

const savePreferenceSettings = async () => {
  currentSettings.preserveScrollPosition =
    optionsElements.preserveScrollInput.checked;
  currentSettings.operatingHours = normalizeOperatingHours({
    enabled: optionsElements.operatingHoursEnabled.checked,
    endTime: optionsElements.operatingEndTime.value,
    startTime: optionsElements.operatingStartTime.value,
    weekdays: [...optionsElements.operatingWeekdays]
      .filter((weekdayInput) => weekdayInput.checked)
      .map((weekdayInput) => Number(weekdayInput.value))
  });

  await saveOptionsSettings();
  syncPreferenceControls();
  updateOptionsStatus(getOptionsCopy("formSettingsSaved"), "success");
};

const loadOptionsSettings = async () => {
  currentSettings = await getStoredOptionsSettings();
  optionsElements.defaultIntervalInput.value = currentSettings.defaultIntervalInMinutes;
  syncPreferenceControls();
  updateSettingsSummary();
  renderSites();
};

const saveDefaultInterval = async () => {
  const defaultInterval = Number(optionsElements.defaultIntervalInput.value);

  if (!Number.isFinite(defaultInterval) || defaultInterval < 1) {
    updateOptionsStatus(
      getOptionsCopy("formInvalidInterval"),
      "error"
    );
    return;
  }

  currentSettings.defaultIntervalInMinutes = Math.floor(defaultInterval);
  await saveOptionsSettings();
  updateSettingsSummary();
  updateOptionsStatus(getOptionsCopy("formSettingsSaved"), "success");
};

const addAutoStartSite = async () => {
  try {
    updateSiteFormAlert();

    const origin = normalizeSiteOrigin(optionsElements.siteOriginInput.value);
    const isDuplicateSite = currentSettings.autoStartSites.some(
      (site) => site.origin === origin
    );

    if (isDuplicateSite) {
      updateSiteFormAlert(getOptionsCopy("formSiteDuplicate"));
      optionsElements.siteOriginInput.focus();
      optionsElements.siteOriginInput.select();
      return;
    }

    const hasPermission = await requestAutoStartPermission(origin);

    if (!hasPermission) {
      updateOptionsStatus(
        getOptionsCopy("formPermissionDenied"),
        "error"
      );
      return;
    }

    const rawInterval = Number(optionsElements.siteIntervalInput.value);
    const intervalInMinutes = Number.isFinite(rawInterval) && rawInterval >= 1
      ? Math.floor(rawInterval)
      : currentSettings.defaultIntervalInMinutes;

    currentSettings.autoStartSites = currentSettings.autoStartSites
      .filter((site) => site.origin !== origin);
    currentSettings.autoStartSites.push({
      enabled: true,
      intervalInMinutes,
      origin
    });

    await saveOptionsSettings();
    renderSites();

    optionsElements.siteOriginInput.value = "";
    optionsElements.siteIntervalInput.value = "";
    updateOptionsStatus(getOptionsCopy("formSiteSaved"), "success");
  } catch (error) {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSiteAddError"),
      "error"
    );
  }
};

const removeAutoStartSite = async (index) => {
  const removedSite = currentSettings.autoStartSites[index];

  currentSettings.autoStartSites.splice(index, 1);
  await saveOptionsSettings();

  if (removedSite?.origin) {
    await removeAutoStartPermissionIfUnused(removedSite.origin);
  }

  renderSites();
  updateOptionsStatus(getOptionsCopy("formSiteRemoved"), "success");
};

const updateOptionsThemeButtonLabel = ({ isDarkTheme }) => {
  const nextThemeLabel = isDarkTheme
    ? getOptionsCopy("themeToLight")
    : getOptionsCopy("themeToDark");

  optionsElements.themeToggleButton.setAttribute("aria-pressed", String(isDarkTheme));
  optionsElements.themeToggleButton.setAttribute("aria-label", nextThemeLabel);
  optionsElements.themeToggleButton.title = nextThemeLabel;
  optionsElements.themeToggleLabel.textContent = isDarkTheme
    ? getOptionsCopy("themeLight")
    : getOptionsCopy("themeDark");
};

const loadOptionsTheme = async () => {
  await loadThemePreference({
    onChange: updateOptionsThemeButtonLabel
  });
};

const toggleOptionsTheme = async () => {
  await toggleThemePreference({
    onChange: updateOptionsThemeButtonLabel
  });
};

const loadOptionsVersion = () => {
  if (typeof chrome === "undefined" || !chrome.runtime?.getManifest) {
    return;
  }

  const manifest = chrome.runtime.getManifest();

  optionsElements.extensionVersion.textContent = manifest.version_name
    || manifest.version;
};

const applyOptionsLanguage = (language) => {
  activeOptionsLanguage = optionsTranslations[language]
    ? language
    : defaultLanguage;
  document.title = getOptionsCopy("documentTitle");

  setTexts(".settings-nav__label", [
    "navGeneral",
    "navSites",
    "navBackup",
    "historyNavLabel",
    "navPermissions"
  ]);
  setText(".settings-header__link span", "headerExit");
  setText(".settings-header__title", "headerTitle");
  setText("#options-title", "pageTitle");
  setText(".brand__subtitle", "pageDescription");
  setText(".settings-page-intro__status span", "introStatusLabel");
  setText(".settings-page-intro__status strong", "introStatusText");
  setText(".settings-sidebar-card__eyebrow", "heroCardBadge");
  setText(".settings-sidebar-card__title", "heroCardTitle");
  setText(".settings-sidebar-card__text", "heroCardBody");
  setText(".panel--general .panel__eyebrow", "preferencesEyebrow");
  setText("#general-title", "defaultTimeLabel");
  setText(".panel--general .panel__description", "timeDescription");
  setText(".settings-row .field__label", "defaultIntervalInputLabel");
  setText("#save-settings-button", "saveDefaultInterval");
  setText("#preserve-scroll-title", "preserveScrollTitle");
  setText("#preserve-scroll-description", "preserveScrollDescription");
  setText("#operating-hours-title", "operatingTitle");
  setText("#operating-hours-description", "operatingDescription");
  setText("#operating-days-label", "operatingDays");
  setText("#operating-start-label", "operatingStart");
  setText("#operating-end-label", "operatingEnd");

  const weekdayShorts = getOptionsCopy("weekdayShorts");

  if (Array.isArray(weekdayShorts)) {
    document.querySelectorAll(".weekday-picker label span")
      .forEach((weekdayLabel, index) => {
        weekdayLabel.textContent = weekdayShorts[index] || weekdayLabel.textContent;
      });
  }
  setText("#sites-title", "sitesTitle");
  setText("#site-form-title", "siteFormTitle");
  setText("#site-form-description", "siteFormDescription");
  setText("#site-origin-label .field__label-text", "siteAddressLabel");
  setText("#site-origin-hint", "siteAddressHint");
  setText("#site-interval-label .field__label-text", "siteIntervalLabel");
  setText("#site-interval-hint", "siteIntervalHint");
  setText("#add-site-button .button__label", "addSite");
  setText(".empty-state strong", "emptySitesTitle");
  setText(".empty-state div span", "emptySitesDescription");
  setText(".panel--sites .empty-state__status", "emptySitesStatus");
  setText(".panel--backup .panel__eyebrow", "backupEyebrow");
  setText("#backup-title", "backupTitle");
  setText(".panel--backup .panel__description", "backupDescription");
  setText("#export-settings-label", "backupExport");
  setText("#export-settings-description", "backupExportDescription");
  setText("#import-settings-label", "backupImport");
  setText("#import-settings-description", "backupImportDescription");
  setText(".backup-note__text", "backupNoteWithHistory");
  setText(".panel--history .panel__eyebrow", "historyEyebrow");
  setText("#history-title", "historyTitle");
  setText(".panel--history .panel__description", "historyDescription");
  setText("#clear-history-button", isHistoryClearPending
    ? "historyClearConfirm"
    : "historyClear");
  setTexts(".history-filter", [
    "historyFilterAll",
    "historyFilterRefreshes",
    "historyFilterTimers"
  ]);
  setText(".history-empty-state strong", "historyEmptyTitle");
  setText(".history-empty-state div span", "historyEmptyDescription");
  setText("#show-more-history-button", "historyShowMore");
  setText("#collapse-history-button", "historyCollapse");
  setText(".history-note", "historyLimitNote");
  setText("#permissions-title", "permissionsTitle");
  setTextAt(".summary-card strong", 0, "defaultTimeLabel");
  setTextAt(".summary-card strong", 1, "autoSitesLabel");
  setTextAt(".summary-card strong", 2, "localControlLabel");
  setTextAt(".summary-card div > span", 2, "localControlText");
  setTextAt(".panel .panel__eyebrow", 1, "autoStartEyebrow");
  setTextAt(".panel .panel__description", 1, "autoStartDescription");
  setText(".panel--permissions .panel__eyebrow", "transparencyEyebrow");
  setText(".panel--permissions .panel__description", "permissionsDescription");
  setTexts(".permission-card strong", [
    "currentPageTitle",
    "cleanupTitle",
    "authorizedSitesTitle",
    "localPreferencesTitle"
  ]);
  setTexts(".permission-card p", [
    "currentPageDescription",
    "cleanupDescription",
    "authorizedSitesDescription",
    "localPreferencesDescription"
  ]);
  setTexts(".privacy-footer__nav a", [
    "footerHome",
    "footerPrivacy",
    "footerFeedback"
  ]);
  setText(".privacy-footer__legal", "footerLegal");
  setText(".privacy-footer__developer-label", "footerDeveloper");
  setText("#open-language-button .floating-action__label", "languageLabel");
  setText("#back-to-top-button .floating-action__label", "backToTop");
  setText("#language-dialog-title", "languageDialogTitle");
  setText(".language-dialog__description", "languageDialogDescription");

  optionsElements.siteIntervalInput.placeholder = getOptionsCopy(
    "defaultIntervalPlaceholder"
  );

  setAttribute(".summary-grid", "aria-label", "permissionsSummaryLabel");
  setAttribute(".permissions-grid", "aria-label", "permissionsGridLabel");
  setAttribute(".settings-nav", "aria-label", "settingsNavLabel");
  setAttribute(".settings-sidebar-card", "aria-label", "heroCardLabel");
  setAttribute("#sites-list", "aria-label", "siteListLabel");
  setAttribute("#history-list", "aria-label", "historyTitle");
  setAttribute(".history-toolbar", "aria-label", "historyFilterLabel");
  setAttribute(".privacy-footer__nav", "aria-label", "linksLabel");
  setAttribute(".privacy-footer__social", "aria-label", "contactChannelsLabel");
  setAttribute(".language-grid", "aria-label", "languageGridLabel");
  setAttribute(".floating-tools", "aria-label", "quickActionsLabel");
  setAttribute("#open-language-button", "aria-label", "languageLabel");
  setAttribute("#back-to-top-button", "aria-label", "backToTop");
  setAttribute("#close-language-button", "aria-label", "closeDialog");

  updateSettingsSummary();
  renderSites();
  renderActionHistory();
  updateOptionsThemeButtonLabel({
    isDarkTheme: document.documentElement.dataset.theme === "dark"
  });
};

const handleOptionsLanguageChange = (language) => {
  applyOptionsLanguage(language);

  saveLanguagePreference({
    language
  }).catch((error) => {
    console.error("Erro ao salvar idioma do RecarregaAi:", error);
  });
};

const initializeOptionsLanguageDialog = async () => {
  const storedLanguage = await loadLanguagePreference({
    fallbackLanguage: (
      localStorage.getItem(optionsPageLanguageStorageKey)
      || document.documentElement.lang
    )
  });

  localStorage.setItem(optionsPageLanguageStorageKey, storedLanguage);
  optionsLanguageDialog = initLanguageDialog({
    onChange: handleOptionsLanguageChange,
    storageKey: optionsPageLanguageStorageKey
  });
};

optionsElements.saveSettingsButton.addEventListener("click", () => {
  saveDefaultInterval().catch((error) => {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSettingsError"),
      "error"
    );
  });
});

const handlePreferenceChange = () => {
  savePreferenceSettings().catch((error) => {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSettingsError"),
      "error"
    );
  });
};

optionsElements.preserveScrollInput.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingHoursEnabled.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingStartTime.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingEndTime.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingWeekdays.forEach((weekdayInput) => {
  weekdayInput.addEventListener("change", handlePreferenceChange);
});

optionsElements.addSiteButton.addEventListener("click", () => {
  addAutoStartSite().catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formSiteSaveError"), "error");
  });
});

optionsElements.sitesList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-index]");

  if (!removeButton) {
    return;
  }

  removeAutoStartSite(Number(removeButton.dataset.removeIndex)).catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formSiteRemoveError"), "error");
  });
});

optionsElements.exportSettingsButton.addEventListener("click", () => {
  try {
    exportOptionsSettings();
  } catch (error) {
    updateOptionsStatus(error.message || getOptionsCopy("formExportError"), "error");
  }
});

optionsElements.importSettingsButton.addEventListener("click", () => {
  optionsElements.importSettingsInput.click();
});

optionsElements.importSettingsInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];

  importOptionsSettingsFromFile(file).catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formImportError"), "error");
  }).finally(() => {
    event.target.value = "";
  });
});

optionsElements.themeToggleButton.addEventListener("click", () => {
  toggleOptionsTheme().catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formThemeError"), "error");
  });
});

optionsElements.closeOptionsButton.addEventListener("click", () => {
  closeOptionsPage();
});

optionsElements.siteOriginInput.addEventListener("input", () => {
  updateSiteFormAlert();
});

optionsElements.historyFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeHistoryFilter = button.dataset.historyFilter;
    visibleHistoryLimit = historyPageSize;

    optionsElements.historyFilterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;

      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });

    renderActionHistory();
  });
});

optionsElements.showMoreHistoryButton.addEventListener("click", () => {
  visibleHistoryLimit += historyPageSize;
  renderActionHistory();
});

optionsElements.collapseHistoryButton.addEventListener("click", () => {
  visibleHistoryLimit = historyPageSize;
  renderActionHistory();
});

optionsElements.clearHistoryButton.addEventListener("click", () => {
  clearStoredActionHistory().catch((error) => {
    resetHistoryClearConfirmation();
    updateOptionsStatus(error.message || getOptionsCopy("formSettingsError"), "error");
  });
});

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    const historyChange = changes[storageKeys.actionHistory];

    if (areaName !== "local" || !historyChange) {
      return;
    }

    currentActionHistory = Array.isArray(historyChange.newValue)
      ? historyChange.newValue
      : [];
    renderActionHistory();
  });
}

initFloatingTools();
initializeOptionsLanguageDialog().catch((error) => {
  console.error("Erro ao carregar idioma do RecarregaAi:", error);
  applyOptionsLanguage(defaultLanguage);
});

loadOptionsVersion();
loadOptionsTheme().catch((error) => {
  updateOptionsStatus(error.message || "Erro ao carregar tema.", "error");
});
loadOptionsSettings().catch((error) => {
  updateOptionsStatus(
    error.message || "Erro ao carregar configurações.",
    "error"
  );
});
loadActionHistory().catch((error) => {
  updateOptionsStatus(
    error.message || getOptionsCopy("formSettingsLoadError"),
    "error"
  );
});
