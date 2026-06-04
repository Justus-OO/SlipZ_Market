import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      appName: 'SlipZMarket',
      language: 'Language',
      adminActive: 'Admin Active',
      notifications: 'Notifications',
      markAllRead: 'Mark all as read',
      switchWorkspace: 'Switch Workspace',
      addFunds: 'Add funds',
      signOut: 'Sign Out',
      dashboardTitle: 'Welcome back',
      dashboardSubtitle: 'Manage your saved lists, enrich contacts, and export leads.',
      buildLeadList: 'Build a new lead list',
      searchLeads: 'Search from over 270M+ verified B2B contacts across 190 countries.',
      prospectSearch: 'Prospect Search',
      filters: 'Filters',
      createFolder: 'Create Folder',
      noListsFound: 'No lists found',
      noListsEmpty: "You haven't built any lead lists yet.",
      generateTestList: 'Generate Test List',
      showingLists: 'Showing {count} of {total} lists',
      checkoutTitle: 'Secure Checkout',
      checkoutSubtitle: 'Review your packages and complete your transaction.',
      orderSummary: 'Order Summary',
      billingDetails: 'Billing Details',
      saveToProfile: 'Save to profile',
      paymentGateway: 'Payment Gateway',
      creditCard: 'Credit Card',
      invoice: 'Invoice',
      secureCardEntry: 'Secure Card Entry',
      fillBillingDetails: 'Please fill Billing Details',
      protectedBy: 'Protected by industry-standard encryption. By completing this purchase, you agree to SlipZMarket\'s Terms of Service and GDPR/CCPA data regulations.',
      historyTitle: 'Billing & Invoices',
      historySubtitle: 'Manage your purchase history, download receipts, and track dataset processing.',
      lifetimeSpend: 'Lifetime Spend',
      totalTransactions: 'Total Transactions',
      pendingDatasets: 'Pending Datasets',
      transactionLedger: 'Transaction Ledger',
      exportLedgerCsv: 'Export Ledger CSV',
      noTransactionsFound: 'No transactions found',
      tryAdjusting: 'Try adjusting your search or filters.',
      recordsFound: 'records found',
      settingsTitle: 'Settings',
      settingsSubtitle: 'Manage your personal profile, workspace details, and security preferences.',
      myProfile: 'My Profile',
      securityLogin: 'Security & Login',
      workspaceInfo: 'Workspace Info',
      billingUsage: 'Billing & Usage',
      notificationsTab: 'Notifications',
      personalInformation: 'Personal Information',
      changePhoto: 'Change Photo',
      timezone: 'Timezone',
      displayCurrency: 'Display Currency',
      saveChanges: 'Save Changes',
      deleteAccount: 'Delete Account',
      deleteProfile: 'Delete Profile',
      adminOverview: 'Admin Overview',
      platformAnalytics: 'Platform analytics, recent user activity, and system health.',
      adminOverviewTitle: 'Admin Overview',
      adminOverviewSubtitle: 'Platform analytics, recent user activity, and system health.',
      managePackagesTitle: 'Manage Packages',
      managePackagesSubtitle: 'Create, edit, and control the dataset inventory.',
      addNewPackage: 'Add New Package',
      importCsv: 'Import CSV',
      exportFiltered: 'Export Filtered',
      exportAll: 'Export All',
      allCategories: 'All Categories',
      categoryBreakdown: 'Category Breakdown',
      packageMetrics: 'Package Metrics',
      totalRevenue: 'Total Revenue',
      totalContacts: 'Total Contacts',
      packageDetails: 'Package Details',
      volumeHealth: 'Volume & Health',
      price: 'Price',
      actions: 'Actions',
      noPackagesFound: 'No packages found',
      adjustFilters: 'Adjust your filters or add a new dataset.',
      packagesTotal: 'packages total',
      leadDatabase: 'Lead Database',
      verifiedNetwork: 'Verified Network',
      savedSearches: 'Saved Searches',
      dataQuality: 'Data Quality',
      verifiedEmailsOnly: 'Verified Emails Only',
      includeDirectDials: 'Include Direct Dials',
      buildNewLeadList: 'Build a new lead list',
      search270m: 'Search from over 270M+ verified B2B contacts across 190 countries.',
      localizedSupport: 'Support Center',
      supportCenter: 'Support Center',
      apiDocumentation: 'API Documentation',
      dataCompliance: 'Data Compliance',
      termsPrivacy: 'Terms & Privacy',
      accepted: 'ACCEPTED:',
      allSystemsOperational: 'All Systems Operational',
      gdprCcpaCompliant: 'GDPR & CCPA Compliant'
      ,invoicesTitle: 'Manage Invoices'
      ,invoicesSubtitle: 'Create, edit, and manage all simulated transactions.'
      ,createInvoice: 'Create Invoice'
      ,allStatuses: 'All Statuses'
      ,noInvoicesFound: 'No invoices found'
      ,adjustSearchOrCreate: 'Adjust your search or create a new invoice.'
      ,invoicesTotal: 'invoices total'
      ,globalSettingsTitle: 'Global Configuration'
      ,globalSettingsSubtitle: 'Manage platform-wide settings, payment keys, and dynamic variables.'
      ,saveConfiguration: 'Save Configuration'
      ,generalBranding: 'General & Branding'
      ,advancedVariables: 'Advanced Variables'
      ,paymentsApi: 'Payments API'
      ,securityTab: 'Security'
      ,mockDataEngine: 'Mock Data Engine'
      ,siteCustomizationTitle: 'Site Customization'
      ,siteCustomizationSubtitle: 'Manage languages, theme branding, and global injected scripts.'
      ,publishChanges: 'Publish Changes'
      ,localization: 'Localization'
      ,themeBrand: 'Theme & Brand'
      ,customScripts: 'Custom Scripts'
      ,emailTemplates: 'Email Templates'
      ,systemVariables: 'System Variables'
      ,languageRegion: 'Language & Region'
      ,defaultSiteLanguage: 'Default Site Language'
      ,systemTimezone: 'System Timezone'
      ,dateFormat: 'Date Format'
      ,enabledLanguages: 'Enabled Languages'
      ,noSystemVariables: 'No system variables configured.'
    }
  },
  es: {
    translation: {
      appName: 'SlipZMarket',
      language: 'Idioma',
      adminActive: 'Admin Activo',
      notifications: 'Notificaciones',
      markAllRead: 'Marcar todo como leído',
      switchWorkspace: 'Cambiar espacio de trabajo',
      addFunds: 'Agregar fondos',
      signOut: 'Cerrar sesión',
      dashboardTitle: 'Bienvenido de nuevo',
      dashboardSubtitle: 'Administra tus listas guardadas, enriquece contactos y exporta clientes potenciales.',
      buildLeadList: 'Crear una nueva lista',
      searchLeads: 'Busca entre más de 270M de contactos B2B verificados en 190 países.',
      prospectSearch: 'Búsqueda de prospectos',
      filters: 'Filtros',
      createFolder: 'Crear carpeta',
      noListsFound: 'No se encontraron listas',
      noListsEmpty: 'Aún no has creado ninguna lista de clientes potenciales.',
      generateTestList: 'Generar lista de prueba',
      showingLists: 'Mostrando {count} de {total} listas',
      checkoutTitle: 'Pago seguro',
      checkoutSubtitle: 'Revisa tus paquetes y completa tu transacción.',
      orderSummary: 'Resumen del pedido',
      billingDetails: 'Datos de facturación',
      saveToProfile: 'Guardar en el perfil',
      paymentGateway: 'Pasarela de pago',
      creditCard: 'Tarjeta de crédito',
      invoice: 'Factura',
      secureCardEntry: 'Ingreso seguro de tarjeta',
      fillBillingDetails: 'Completa los datos de facturación',
      protectedBy: 'Protegido por cifrado estándar de la industria. Al completar esta compra, aceptas los Términos de servicio y las regulaciones de datos GDPR/CCPA de SlipZMarket.',
      historyTitle: 'Facturación y facturas',
      historySubtitle: 'Administra tu historial de compras, descarga recibos y sigue el procesamiento de conjuntos de datos.',
      lifetimeSpend: 'Gasto total',
      totalTransactions: 'Transacciones totales',
      pendingDatasets: 'Conjuntos pendientes',
      transactionLedger: 'Registro de transacciones',
      exportLedgerCsv: 'Exportar CSV del registro',
      noTransactionsFound: 'No se encontraron transacciones',
      tryAdjusting: 'Prueba ajustando la búsqueda o los filtros.',
      recordsFound: 'registros encontrados',
      settingsTitle: 'Configuración',
      settingsSubtitle: 'Administra tu perfil personal, detalles del espacio de trabajo y preferencias de seguridad.',
      myProfile: 'Mi perfil',
      securityLogin: 'Seguridad e inicio de sesión',
      workspaceInfo: 'Información del espacio',
      billingUsage: 'Facturación y uso',
      notificationsTab: 'Notificaciones',
      personalInformation: 'Información personal',
      changePhoto: 'Cambiar foto',
      timezone: 'Zona horaria',
      displayCurrency: 'Moneda mostrada',
      saveChanges: 'Guardar cambios',
      deleteAccount: 'Eliminar cuenta',
      deleteProfile: 'Eliminar perfil',
      adminOverview: 'Resumen de administrador',
      platformAnalytics: 'Analítica de la plataforma, actividad reciente de usuarios y estado del sistema.',
      adminOverviewTitle: 'Resumen de administrador',
      adminOverviewSubtitle: 'Analítica de la plataforma, actividad reciente de usuarios y estado del sistema.',
      managePackagesTitle: 'Administrar paquetes',
      managePackagesSubtitle: 'Crea, edita y controla el inventario de datos.',
      addNewPackage: 'Agregar nuevo paquete',
      importCsv: 'Importar CSV',
      exportFiltered: 'Exportar filtrados',
      exportAll: 'Exportar todo',
      allCategories: 'Todas las categorías',
      categoryBreakdown: 'Desglose por categoría',
      packageMetrics: 'Métricas del paquete',
      totalRevenue: 'Ingresos totales',
      totalContacts: 'Contactos totales',
      packageDetails: 'Detalles del paquete',
      volumeHealth: 'Volumen y estado',
      price: 'Precio',
      actions: 'Acciones',
      noPackagesFound: 'No se encontraron paquetes',
      adjustFilters: 'Ajusta los filtros o agrega un nuevo conjunto de datos.',
      packagesTotal: 'paquetes en total',
      leadDatabase: 'Base de datos de clientes',
      verifiedNetwork: 'Red verificada',
      savedSearches: 'Búsquedas guardadas',
      dataQuality: 'Calidad de datos',
      verifiedEmailsOnly: 'Solo correos verificados',
      includeDirectDials: 'Incluir números directos',
      buildNewLeadList: 'Crear una nueva lista',
      search270m: 'Busca entre más de 270M de contactos B2B verificados en 190 países.',
      supportCenter: 'Centro de soporte',
      apiDocumentation: 'Documentación de la API',
      dataCompliance: 'Cumplimiento de datos',
      termsPrivacy: 'Términos y privacidad',
      accepted: 'ACEPTADO:',
      allSystemsOperational: 'Todos los sistemas operativos',
      gdprCcpaCompliant: 'Compatible con GDPR y CCPA'
      ,invoicesTitle: 'Administrar facturas'
      ,invoicesSubtitle: 'Crea, edita y administra todas las transacciones simuladas.'
      ,createInvoice: 'Crear factura'
      ,allStatuses: 'Todos los estados'
      ,noInvoicesFound: 'No se encontraron facturas'
      ,adjustSearchOrCreate: 'Ajusta tu búsqueda o crea una nueva factura.'
      ,invoicesTotal: 'facturas en total'
      ,globalSettingsTitle: 'Configuración global'
      ,globalSettingsSubtitle: 'Administra la configuración global de la plataforma, las claves de pago y las variables dinámicas.'
      ,saveConfiguration: 'Guardar configuración'
      ,generalBranding: 'General y marca'
      ,advancedVariables: 'Variables avanzadas'
      ,paymentsApi: 'API de pagos'
      ,securityTab: 'Seguridad'
      ,mockDataEngine: 'Motor de datos simulados'
      ,siteCustomizationTitle: 'Personalización del sitio'
      ,siteCustomizationSubtitle: 'Administra idiomas, marca visual y scripts globales inyectados.'
      ,publishChanges: 'Publicar cambios'
      ,localization: 'Localización'
      ,themeBrand: 'Tema y marca'
      ,customScripts: 'Scripts personalizados'
      ,emailTemplates: 'Plantillas de correo'
      ,systemVariables: 'Variables del sistema'
      ,languageRegion: 'Idioma y región'
      ,defaultSiteLanguage: 'Idioma predeterminado del sitio'
      ,systemTimezone: 'Zona horaria del sistema'
      ,dateFormat: 'Formato de fecha'
      ,enabledLanguages: 'Idiomas habilitados'
      ,noSystemVariables: 'No hay variables del sistema configuradas.'
    }
  },
  fr: {
    translation: {
      appName: 'SlipZMarket',
      language: 'Langue',
      adminActive: 'Admin actif',
      notifications: 'Notifications',
      markAllRead: 'Tout marquer comme lu',
      switchWorkspace: 'Changer d’espace de travail',
      addFunds: 'Ajouter des fonds',
      signOut: 'Déconnexion',
      dashboardTitle: 'Bon retour',
      dashboardSubtitle: 'Gérez vos listes enregistrées, enrichissez les contacts et exportez des prospects.',
      buildLeadList: 'Créer une nouvelle liste',
      searchLeads: 'Recherchez parmi plus de 270M de contacts B2B vérifiés dans 190 pays.',
      prospectSearch: 'Recherche de prospects',
      filters: 'Filtres',
      createFolder: 'Créer un dossier',
      noListsFound: 'Aucune liste trouvée',
      noListsEmpty: 'Vous n’avez encore créé aucune liste de prospects.',
      generateTestList: 'Générer une liste de test',
      showingLists: 'Affichage de {count} sur {total} listes',
      checkoutTitle: 'Paiement sécurisé',
      checkoutSubtitle: 'Vérifiez vos forfaits et finalisez votre transaction.',
      orderSummary: 'Récapitulatif de commande',
      billingDetails: 'Informations de facturation',
      saveToProfile: 'Enregistrer dans le profil',
      paymentGateway: 'Passerelle de paiement',
      creditCard: 'Carte de crédit',
      invoice: 'Facture',
      secureCardEntry: 'Saisie sécurisée de carte',
      fillBillingDetails: 'Veuillez remplir les informations de facturation',
      protectedBy: 'Protégé par un chiffrement standard du secteur. En finalisant cet achat, vous acceptez les conditions d’utilisation et les réglementations GDPR/CCPA de SlipZMarket.',
      historyTitle: 'Facturation et factures',
      historySubtitle: 'Gérez votre historique d’achats, téléchargez les reçus et suivez le traitement des ensembles de données.',
      lifetimeSpend: 'Dépense totale',
      totalTransactions: 'Transactions totales',
      pendingDatasets: 'Ensembles en attente',
      transactionLedger: 'Journal des transactions',
      exportLedgerCsv: 'Exporter le CSV du journal',
      noTransactionsFound: 'Aucune transaction trouvée',
      tryAdjusting: 'Essayez d’ajuster votre recherche ou vos filtres.',
      recordsFound: 'enregistrements trouvés',
      settingsTitle: 'Paramètres',
      settingsSubtitle: 'Gérez votre profil personnel, les détails de votre espace de travail et vos préférences de sécurité.',
      myProfile: 'Mon profil',
      securityLogin: 'Sécurité et connexion',
      workspaceInfo: 'Infos de l’espace de travail',
      billingUsage: 'Facturation et utilisation',
      notificationsTab: 'Notifications',
      personalInformation: 'Informations personnelles',
      changePhoto: 'Changer la photo',
      timezone: 'Fuseau horaire',
      displayCurrency: 'Devise affichée',
      saveChanges: 'Enregistrer les modifications',
      deleteAccount: 'Supprimer le compte',
      deleteProfile: 'Supprimer le profil',
      adminOverview: 'Vue d’ensemble admin',
      platformAnalytics: 'Analyses de la plateforme, activité récente des utilisateurs et état du système.',
      adminOverviewTitle: 'Vue d’ensemble admin',
      adminOverviewSubtitle: 'Analyses de la plateforme, activité récente des utilisateurs et état du système.',
      managePackagesTitle: 'Gérer les forfaits',
      managePackagesSubtitle: 'Créez, modifiez et contrôlez l’inventaire des données.',
      addNewPackage: 'Ajouter un nouveau forfait',
      importCsv: 'Importer CSV',
      exportFiltered: 'Exporter filtrés',
      exportAll: 'Exporter tout',
      allCategories: 'Toutes les catégories',
      categoryBreakdown: 'Répartition par catégorie',
      packageMetrics: 'Métriques du forfait',
      totalRevenue: 'Revenu total',
      totalContacts: 'Contacts totaux',
      packageDetails: 'Détails du forfait',
      volumeHealth: 'Volume et état',
      price: 'Prix',
      actions: 'Actions',
      noPackagesFound: 'Aucun forfait trouvé',
      adjustFilters: 'Ajustez vos filtres ou ajoutez un nouvel ensemble de données.',
      packagesTotal: 'forfaits au total',
      leadDatabase: 'Base de données de prospects',
      verifiedNetwork: 'Réseau vérifié',
      savedSearches: 'Recherches enregistrées',
      dataQuality: 'Qualité des données',
      verifiedEmailsOnly: 'Emails vérifiés uniquement',
      includeDirectDials: 'Inclure les lignes directes',
      buildNewLeadList: 'Créer une nouvelle liste',
      search270m: 'Recherchez parmi plus de 270M de contacts B2B vérifiés dans 190 pays.',
      supportCenter: 'Centre d’assistance',
      apiDocumentation: 'Documentation API',
      dataCompliance: 'Conformité des données',
      termsPrivacy: 'Conditions et confidentialité',
      accepted: 'ACCEPTÉ :',
      allSystemsOperational: 'Tous les systèmes fonctionnent',
      gdprCcpaCompliant: 'Conforme au RGPD et au CCPA'
      ,invoicesTitle: 'Gérer les factures'
      ,invoicesSubtitle: 'Créez, modifiez et gérez toutes les transactions simulées.'
      ,createInvoice: 'Créer une facture'
      ,allStatuses: 'Tous les statuts'
      ,noInvoicesFound: 'Aucune facture trouvée'
      ,adjustSearchOrCreate: 'Ajustez votre recherche ou créez une nouvelle facture.'
      ,invoicesTotal: 'factures au total'
      ,globalSettingsTitle: 'Configuration globale'
      ,globalSettingsSubtitle: 'Gérez les paramètres globaux de la plateforme, les clés de paiement et les variables dynamiques.'
      ,saveConfiguration: 'Enregistrer la configuration'
      ,generalBranding: 'Général et marque'
      ,advancedVariables: 'Variables avancées'
      ,paymentsApi: 'API de paiement'
      ,securityTab: 'Sécurité'
      ,mockDataEngine: 'Moteur de données factices'
      ,siteCustomizationTitle: 'Personnalisation du site'
      ,siteCustomizationSubtitle: 'Gérez les langues, l’image de marque et les scripts globaux injectés.'
      ,publishChanges: 'Publier les modifications'
      ,localization: 'Localisation'
      ,themeBrand: 'Thème et marque'
      ,customScripts: 'Scripts personnalisés'
      ,emailTemplates: 'Modèles d’e-mail'
      ,systemVariables: 'Variables système'
      ,languageRegion: 'Langue et région'
      ,defaultSiteLanguage: 'Langue par défaut du site'
      ,systemTimezone: 'Fuseau horaire du système'
      ,dateFormat: 'Format de date'
      ,enabledLanguages: 'Langues activées'
      ,noSystemVariables: 'Aucune variable système configurée.'
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;