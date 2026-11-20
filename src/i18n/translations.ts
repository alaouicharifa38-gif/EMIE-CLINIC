import type { AppointmentStatus, Language } from '../../shared/types.ts';

export interface TranslationDictionary {
  nav: {
    home: string;
    about: string;
    services: string;
    contact: string;
    bookNow: string;
    adminPortal: string;
  };
  hero: {
    kicker: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    locationLabel: string;
  };
  welcome: {
    eyebrow: string;
    title: string;
    paragraph1: string;
    paragraph2: string;
  };
  about: {
    eyebrow: string;
    title: string;
    lead: string;
    pillars: Array<{ title: string; detail: string }>;
    closing: string;
  };
  servicesSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    bookService: string;
    durationUnit: string;
    officialDescriptions: Record<string, { name: string; description: string }>;
  };
  whyChoose: {
    eyebrow: string;
    title: string;
    items: Array<{ number: string; title: string; description: string }>;
  };
  ctaBand: {
    title: string;
    subtitle: string;
    button: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    addressLabel: string;
    phoneLabel: string;
    hoursLabel: string;
    hoursNotConfigured: string;
    instagramLabel: string;
    instagramTitle: string;
    instagramBody: string;
    instagramCta: string;
  };
  footer: {
    rights: string;
    privacyNotice: string;
    staffAccess: string;
    manageBooking: string;
  };
  selfService: {
    title: string;
    subtitle: string;
    bookingRef: string;
    contact: string;
    contactPlaceholder: string;
    lookupBtn: string;
    searching: string;
    anotherLookup: string;
    referenceLabel: string;
    service: string;
    currentSlot: string;
    practitioner: string;
    anyPractitioner: string;
    status: string;
    requestReschedule: string;
    requestCancel: string;
    selectService: string;
    selectPractitioner: string;
    newDate: string;
    newTime: string;
    checkingAvailability: string;
    unavailableSlotTag: string;
    noSlotsAvailable: string;
    reason: string;
    modifyReasonPlaceholder: string;
    submitRequest: string;
    submitting: string;
    modifySuccessTitle: string;
    modifySuccessBody: string;
    cancelWarningTitle: string;
    cancelWarningBody: string;
    cancelReasonLabel: string;
    cancelReasonPlaceholder: string;
    cancelAcknowledge: string;
    confirmCancelBtn: string;
    cancellingBtn: string;
    cancelSuccessTitle: string;
    cancelSuccessBody: string;
    lockedStatus: string;
    noChangesError: string;
    slotUnavailableError: string;
    notFoundError: string;
    missingFieldsError: string;
    invalidScheduleError: string;
    deadlinePassedError: string;
    cancelConfirmRequiredError: string;
    deadlineNotice: string;
    close: string;
  };
  booking: {
    title: string;
    subtitle: string;
    steps: [string, string, string, string, string];
    selectServicePrompt: string;
    fullName: string;
    phone: string;
    email: string;
    emailOptionalHint: string;
    preferredLanguage: string;
    preferredDate: string;
    preferredTime: string;
    checkingAvailability: string;
    unavailableSlotTag: string;
    noSlotsAvailable: string;
    alternativeDate: string;
    alternativeTime: string;
    optionalLabel: string;
    message: string;
    messagePlaceholder: string;
    reviewTitle: string;
    reviewNotice: string;
    consentText: string;
    back: string;
    next: string;
    edit: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successBody: string;
    referenceLabel: string;
    statusPendingBadge: string;
    newBooking: string;
    close: string;
    errors: {
      selectService: string;
      fullNameRequired: string;
      phoneInvalid: string;
      emailRequired: string;
      emailInvalid: string;
      dateRequired: string;
      timeRequired: string;
      consentRequired: string;
      slotConflict: string;
      airtableMissing: string;
      generic: string;
    };
  };
  statuses: Record<AppointmentStatus, string>;
  admin: {
    loginTitle: string;
    loginSubtitle: string;
    email: string;
    password: string;
    signIn: string;
    signingIn: string;
    backToWebsite: string;
    setupTitle: string;
    setupSubtitle: string;
    setupToken: string;
    fullName: string;
    createSuperAdmin: string;
    logout: string;
    nav: {
      overview: string;
      appointments: string;
      calendar: string;
      clients: string;
      services: string;
      staff: string;
      notifications: string;
      reports: string;
      settings: string;
    };
    kpis: {
      totalAppointments: string;
      newRequests: string;
      pendingConfirmations: string;
      confirmed: string;
      today: string;
      upcoming: string;
      completed: string;
      cancelled: string;
      totalClients: string;
    };
    common: {
      search: string;
      filterStatus: string;
      filterService: string;
      all: string;
      dateFrom: string;
      dateTo: string;
      save: string;
      cancel: string;
      confirm: string;
      reschedule: string;
      reject: string;
      details: string;
      actions: string;
      noRecords: string;
      loading: string;
      refresh: string;
      refreshing: string;
      retry: string;
      exportCsv: string;
      retryWebhook: string;
      internalNotes: string;
      assignedStaff: string;
      unassigned: string;
      active: string;
      inactive: string;
      awaitingConfigTitle: string;
      awaitingConfigDesc: string;
    };
    appointments: {
      edit: string;
      delete: string;
      history: string;
      noHistory: string;
      loadingHistory: string;
      clientName: string;
      clientPhone: string;
      clientEmail: string;
      clientLanguage: string;
      service: string;
      preferredDate: string;
      preferredTime: string;
      alternativeDate: string;
      alternativeTime: string;
      clientMessage: string;
      cancellationReason: string;
      rescheduleReason: string;
      deleteReason: string;
      previousSlot: string;
      newSlot: string;
      staffAvailability: string;
      editSuccess: string;
      rescheduleSuccess: string;
      cancelSuccess: string;
      deleteSuccess: string;
      confirmCancelTitle: string;
      confirmCancelDesc: string;
      confirmRescheduleTitle: string;
      confirmRescheduleDesc: string;
      confirmDeleteTitle: string;
      confirmDeleteWarning: string;
      confirmationDate: string;
      noSlotsAvailable: string;
      slotOccupiedWarning: string;
      reminderSent: string;
      reminderNotSent: string;
      saveChanges: string;
    };
    diagnostics: {
      missing_token: string;
      missing_base_id: string;
      invalid_credentials: string;
      insufficient_permissions: string;
      base_or_table_not_found: string;
      network_error: string;
      connected: string;
      not_probed: string;
      allowAdminDeleteLabel: string;
    };
    errors: {
      sessionExpired: string;
      cookieBlocked: string;
      loadFailed: string;
    };
  };
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  fr: {
    nav: {
      home: 'Accueil',
      about: 'Qui sommes-nous',
      services: 'Nos services',
      contact: 'Contact',
      bookNow: 'Prendre rendez-vous',
      adminPortal: 'Espace Équipe',
    },
    hero: {
      kicker: 'Clinique médico-esthétique et kinésithérapie · Casablanca',
      headline: 'ICI, LE CORPS RETROUVE SON HARMONIE.',
      subheadline:
        'Clinique où science et bien-être se rencontrent pour révéler le meilleur de vous-même.',
      primaryCta: 'Prendre rendez-vous',
      secondaryCta: 'Découvrir nos soins',
      locationLabel: 'Racine, Casablanca',
    },
    welcome: {
      eyebrow: 'Bienvenue chez EMIE CLINIC',
      title: 'Une approche personnalisée au cœur de Casablanca',
      paragraph1:
        'Établie au cœur de Casablanca, Emie Clinic est spécialisée dans la kinésithérapie & ostéopathie, l’amincissement, le cupping / Hijama et les soins du visage.',
      paragraph2:
        'Alliant confort et professionnalisme, notre équipe qualifiée vous accueille pour des traitements sûrs et personnalisés.',
    },
    about: {
      eyebrow: 'EMIE CLINIC',
      title: 'L’excellence au service de votre beauté et de votre bien-être.',
      lead: 'Chez Emie Clinic, notre engagement, au-delà du soin, c’est une expérience complète :',
      pillars: [
        {
          title: 'Kinésithérapie et ostéopathie',
          detail: 'Soulager, rééduquer, rééquilibrer.',
        },
        {
          title: 'Amincissement non invasif',
          detail: 'Sculpter votre silhouette sans chirurgie.',
        },
        {
          title: 'Cupping / Hijama',
          detail: 'Libérer les tensions, stimuler la récupération.',
        },
        {
          title: 'Soins du visage',
          detail: 'Purifier, hydrater, illuminer la peau.',
        },
      ],
      closing:
        'Le tout dans un espace moderne et apaisant, pensé pour votre bien-être. Votre corps mérite plus qu’un soin : une vraie transformation.',
    },
    servicesSection: {
      eyebrow: 'Nos spécialités',
      title: 'Cinq pôles de soins dédiés à votre équilibre',
      subtitle:
        'Chaque protocole est adapté à vos besoins lors d’une prise en charge individuelle par nos spécialistes.',
      bookService: 'Demander un rendez-vous',
      durationUnit: 'min',
      officialDescriptions: {
        kinesitherapie: {
          name: 'Kinésithérapie',
          description:
            'Rééducation post-blessure, soulagement des douleurs chroniques et optimisation de la récupération physique encadrée par nos spécialistes.',
        },
        osteopathie: {
          name: 'Ostéopathie',
          description:
            "L'ostéopathie vise à restaurer l'équilibre global du corps en agissant sur les tensions musculaires, articulaires et viscérales.",
        },
        amincissement: {
          name: 'Amincissement',
          description:
            'Redessinez votre silhouette sans chirurgie grâce à des techniques esthétiques avancées et durables.',
        },
        cupping: {
          name: 'Cupping / Hijama',
          description:
            'Technique manuelle puissante pour détendre les tissus profonds, relancer la circulation et favoriser la récupération musculaire.',
        },
        'soins-du-visage': {
          name: 'Soins du visage',
          description:
            "Alliez technologie esthétique et gestuelle experte pour nettoyer, hydrater, lisser et raviver l'éclat naturel de votre peau.",
        },
      },
    },
    whyChoose: {
      eyebrow: 'Notre engagement',
      title: 'Pourquoi choisir EMIE CLINIC',
      items: [
        {
          number: '01',
          title: 'Science & Bien-être',
          description:
            'Une prise en charge réunissant kinésithérapie, ostéopathie et soins médico-esthétiques non invasifs sous un même toit.',
        },
        {
          number: '02',
          title: 'Soins sans chirurgie',
          description:
            'Des protocoles d’amincissement et de soins du visage avancés, respectueux de votre physiologie et sans intervention chirurgicale.',
        },
        {
          number: '03',
          title: 'Cadre apaisant à Racine',
          description:
            'Située au 7ème étage de Prince Bureaux sur le Boulevard Mohamed Zerktouni, la clinique offre un espace calme et confidentiel.',
        },
        {
          number: '04',
          title: 'Validation personnalisée',
          description:
            'Chaque demande de rendez-vous est examinée et confirmée directement par notre équipe afin de garantir votre créneau.',
        },
      ],
    },
    ctaBand: {
      title: 'Vous ne savez pas quel soin est fait pour vous ?',
      subtitle:
        'Prenez rendez-vous pour un diagnostic personnalisé avec nos experts médico-esthétiques.',
      button: 'Demander un rendez-vous',
    },
    contact: {
      eyebrow: 'Contact & Accès',
      title: 'Nous rendre visite à Casablanca',
      addressLabel: 'Adresse',
      phoneLabel: 'Prise de rendez-vous',
      hoursLabel: 'Horaires d’ouverture',
      hoursNotConfigured: 'Communiqués lors de la confirmation téléphonique.',
      instagramLabel: 'Instagram',
      instagramTitle: 'Suivez @emieclinic sur Instagram',
      instagramBody:
        'Découvrez la vie de la clinique, nos protocoles de soins et les conseils de notre équipe au quotidien.',
      instagramCta: 'Ouvrir @emieclinic',
    },
    footer: {
      rights: 'EMIE CLINIC — Tous droits réservés.',
      privacyNotice: 'Données traitées dans le respect de la confidentialité (Loi 09-08).',
      staffAccess: 'Administration',
      manageBooking: 'Gérer mon rendez-vous',
    },
    selfService: {
      title: 'Gérer mon rendez-vous',
      subtitle:
        'Accédez à votre rendez-vous avec votre référence et le téléphone ou e-mail associé.',
      bookingRef: 'Référence de rendez-vous (ex. EMIE-20261118-A1B2)',
      contact: 'Téléphone ou e-mail associé au rendez-vous',
      contactPlaceholder: '+212 6... ou nom@exemple.com',
      lookupBtn: 'Accéder à mon rendez-vous',
      searching: 'Vérification...',
      anotherLookup: 'Rechercher un autre rendez-vous',
      referenceLabel: 'Référence',
      service: 'Soin',
      currentSlot: 'Créneau actuel',
      practitioner: 'Praticien',
      anyPractitioner: 'Aucune préférence (premier disponible)',
      status: 'Statut',
      requestReschedule: 'Modifier le rendez-vous',
      requestCancel: 'Annuler le rendez-vous',
      selectService: 'Soin souhaité',
      selectPractitioner: 'Praticien disponible (optionnel)',
      newDate: 'Nouvelle date',
      newTime: 'Nouveau créneau horaire',
      checkingAvailability: 'Vérification des disponibilités...',
      unavailableSlotTag: 'Indisponible',
      noSlotsAvailable:
        'Aucun créneau disponible pour cette date. Veuillez choisir une autre date.',
      reason: 'Note ou motif (optionnel)',
      modifyReasonPlaceholder: 'Ex. contrainte d’horaire',
      submitRequest: 'Enregistrer les modifications',
      submitting: 'Enregistrement...',
      modifySuccessTitle: 'Rendez-vous mis à jour',
      modifySuccessBody:
        'Votre rendez-vous a été modifié avec succès dans notre agenda. La clinique en a été informée.',
      cancelWarningTitle: 'Confirmation d’annulation requise',
      cancelWarningBody:
        'Attention : l’annulation en ligne est définitive et ne peut pas être annulée par la suite depuis cet espace. Pour reprendre rendez-vous, vous devrez effectuer une nouvelle réservation.',
      cancelReasonLabel: 'Motif d’annulation (optionnel)',
      cancelReasonPlaceholder: 'Ex. empêchement personnel',
      cancelAcknowledge: 'Je comprends que cette annulation est définitive et souhaite annuler mon rendez-vous.',
      confirmCancelBtn: 'Confirmer l’annulation',
      cancellingBtn: 'Annulation en cours...',
      cancelSuccessTitle: 'Rendez-vous annulé',
      cancelSuccessBody:
        'Votre rendez-vous a bien été annulé et l’équipe EMIE CLINIC a été notifiée.',
      lockedStatus: 'Ce rendez-vous ne peut plus être modifié ou annulé en ligne. Veuillez contacter le secrétariat.',
      noChangesError: 'Veuillez modifier la date, l’heure, le soin ou le praticien avant d’enregistrer.',
      slotUnavailableError: 'Ce créneau n’est plus disponible. Veuillez en sélectionner un autre.',
      notFoundError: 'Aucun rendez-vous ne correspond à cette référence et à ces coordonnées.',
      missingFieldsError: 'Veuillez saisir votre référence de rendez-vous et votre téléphone ou e-mail.',
      invalidScheduleError: 'Veuillez sélectionner une date et un créneau horaire valides à venir.',
      deadlinePassedError: 'Le délai de modification ou d’annulation en ligne pour ce rendez-vous est dépassé. Veuillez contacter le secrétariat.',
      cancelConfirmRequiredError: 'Veuillez cocher la case de confirmation avant d’annuler votre rendez-vous.',
      deadlineNotice: 'Délai de modification en ligne configuré par la clinique :',
      close: 'Fermer',
    },
    booking: {
      title: 'Demande de rendez-vous',
      subtitle:
        'Complétez votre demande en quelques étapes. Notre équipe vous confirmera le créneau définitif.',
      steps: ['Soin', 'Coordonnées', 'Préférences', 'Vérification', 'Confirmation'],
      selectServicePrompt: 'Choisissez le soin souhaité :',
      fullName: 'Nom complet',
      phone: 'Numéro de téléphone',
      email: 'Adresse e-mail',
      emailOptionalHint: 'Optionnel',
      preferredLanguage: 'Langue préférée',
      preferredDate: 'Date souhaitée',
      preferredTime: 'Heure souhaitée',
      checkingAvailability: 'Vérification des disponibilités...',
      unavailableSlotTag: 'Indisponible',
      noSlotsAvailable:
        'Aucun créneau disponible pour cette date. Veuillez choisir une autre date.',
      alternativeDate: 'Date alternative',
      alternativeTime: 'Heure alternative',
      optionalLabel: 'Optionnel',
      message: 'Message complémentaire',
      messagePlaceholder:
        'Précisez vos disponibilités ou questions générales (sans données médicales sensibles).',
      reviewTitle: 'Vérifiez votre demande avant envoi',
      reviewNotice:
        'Important : l’envoi de ce formulaire constitue une demande de rendez-vous. Votre créneau devient définitif uniquement après confirmation par notre équipe.',
      consentText:
        'J’accepte que EMIE CLINIC traite mes coordonnées uniquement pour organiser ce rendez-vous, conformément à la politique de confidentialité et à la loi 09-08.',
      back: 'Retour',
      next: 'Continuer',
      edit: 'Modifier',
      submit: 'Envoyer la demande',
      submitting: 'Envoi en cours...',
      successTitle: 'Demande enregistrée avec succès',
      successBody:
        'Votre demande est actuellement en attente de confirmation. Notre secrétariat vous contactera très prochainement.',
      referenceLabel: 'Référence de demande',
      statusPendingBadge: 'En attente de confirmation',
      newBooking: 'Nouvelle demande',
      close: 'Fermer',
      errors: {
        selectService: 'Veuillez sélectionner un service.',
        fullNameRequired: 'Veuillez saisir votre nom complet.',
        phoneInvalid: 'Veuillez saisir un numéro de téléphone valide.',
        emailRequired: 'L’adresse e-mail est requise.',
        emailInvalid: 'Le format de l’adresse e-mail est invalide.',
        dateRequired: 'Veuillez choisir une date souhaitée.',
        timeRequired: 'Veuillez choisir une heure souhaitée.',
        consentRequired: 'Votre consentement est requis pour envoyer la demande.',
        slotConflict:
          'Ce créneau horaire n’est plus disponible. Veuillez choisir une autre date ou heure.',
        airtableMissing:
          'La base de données Airtable n’est pas encore configurée sur le serveur (AIRTABLE_ACCESS_TOKEN / AIRTABLE_BASE_ID manquants). Vos données ont été conservées.',
        generic: 'Impossible d’enregistrer la demande pour le moment. Vos données ont été conservées.',
      },
    },
    statuses: {
      'New Request': 'Nouvelle demande',
      'Pending Confirmation': 'En attente de confirmation',
      Confirmed: 'Confirmé',
      Rescheduled: 'Replanifié',
      Completed: 'Terminé',
      Cancelled: 'Annulé',
      'No Show': 'Absent',
    },
    admin: {
      loginTitle: 'Portail d’administration EMIE CLINIC',
      loginSubtitle: 'Accès réservé aux administrateurs et praticiens autorisés.',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      signIn: 'Se connecter',
      signingIn: 'Connexion...',
      backToWebsite: 'Retour au site public',
      setupTitle: 'Configuration initiale Super Admin',
      setupSubtitle: 'Créez le premier compte Super Admin protégé par le jeton serveur.',
      setupToken: 'Jeton de configuration (ADMIN_SETUP_TOKEN)',
      fullName: 'Nom complet',
      createSuperAdmin: 'Créer le Super Admin',
      logout: 'Déconnexion',
      nav: {
        overview: 'Vue d’ensemble',
        appointments: 'Rendez-vous',
        calendar: 'Calendrier',
        clients: 'Clients',
        services: 'Services',
        staff: 'Équipe',
        notifications: 'Notifications',
        reports: 'Rapports',
        settings: 'Paramètres',
      },
      kpis: {
        totalAppointments: 'Total rendez-vous',
        newRequests: 'Nouvelles demandes',
        pendingConfirmations: 'En attente',
        confirmed: 'Confirmés',
        today: 'Aujourd’hui',
        upcoming: 'À venir',
        completed: 'Terminés',
        cancelled: 'Annulés',
        totalClients: 'Total clients',
      },
      common: {
        search: 'Rechercher...',
        filterStatus: 'Statut',
        filterService: 'Service',
        all: 'Tous',
        dateFrom: 'Du',
        dateTo: 'Au',
        save: 'Enregistrer',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        reschedule: 'Replanifier',
        reject: 'Annuler le RDV',
        details: 'Détails',
        actions: 'Actions',
        noRecords: 'Aucun enregistrement trouvé.',
        loading: 'Chargement des données Airtable...',
        refresh: 'Actualiser',
        refreshing: 'Actualisation...',
        retry: 'Réessayer',
        exportCsv: 'Exporter CSV',
        retryWebhook: 'Relancer Make.com',
        internalNotes: 'Notes internes privées',
        assignedStaff: 'Praticien assigné',
        unassigned: 'Non assigné',
        active: 'Actif',
        inactive: 'Inactif',
        awaitingConfigTitle: 'Configuration Airtable requise',
        awaitingConfigDesc:
          'Aucune base Airtable n’est encore connectée. Configurez AIRTABLE_ACCESS_TOKEN et AIRTABLE_BASE_ID sur le serveur pour activer les données réelles.',
      },
      appointments: {
        edit: 'Modifier',
        delete: 'Supprimer',
        history: 'Historique d’activité',
        noHistory: 'Aucune modification enregistrée pour ce rendez-vous.',
        loadingHistory: 'Chargement de l’historique...',
        clientName: 'Nom du client',
        clientPhone: 'Téléphone',
        clientEmail: 'E-mail',
        clientLanguage: 'Langue client',
        service: 'Service',
        preferredDate: 'Date souhaitée',
        preferredTime: 'Heure souhaitée',
        alternativeDate: 'Date alternative',
        alternativeTime: 'Heure alternative',
        clientMessage: 'Message client',
        cancellationReason: 'Motif d’annulation',
        rescheduleReason: 'Motif de replanification (optionnel)',
        deleteReason: 'Motif de suppression (enregistré dans les logs)',
        previousSlot: 'Ancien créneau',
        newSlot: 'Nouveau créneau',
        staffAvailability: 'Disponibilité du praticien',
        editSuccess: 'Rendez-vous mis à jour dans Airtable.',
        rescheduleSuccess: 'Rendez-vous replanifié et enregistré dans Airtable.',
        cancelSuccess: 'Rendez-vous annulé avec conservation de l’historique.',
        deleteSuccess: 'Rendez-vous supprimé définitivement d’Airtable.',
        confirmCancelTitle: 'Confirmer l’annulation du rendez-vous',
        confirmCancelDesc:
          'Le rendez-vous sera conservé dans Airtable avec le statut Annulé et votre motif.',
        confirmRescheduleTitle: 'Confirmer la replanification',
        confirmRescheduleDesc:
          'L’ancien créneau sera archivé dans l’historique et Make.com sera déclenché après sauvegarde.',
        confirmDeleteTitle: 'Suppression définitive du rendez-vous',
        confirmDeleteWarning:
          'Attention : cette action supprime définitivement le rendez-vous dans Airtable et ne peut pas être annulée. La fiche client associée est conservée et un journal d’audit est enregistré avant suppression.',
        confirmationDate: 'Confirmé le',
        noSlotsAvailable:
          'Aucun créneau disponible pour cette date. Veuillez choisir une autre date.',
        slotOccupiedWarning:
          'Ce créneau chevauche déjà un rendez-vous confirmé. Veuillez choisir un autre horaire.',
        reminderSent: 'Rappel envoyé',
        reminderNotSent: 'Rappel en attente',
        saveChanges: 'Enregistrer les modifications',
      },
      diagnostics: {
        missing_token: 'Jeton AIRTABLE_ACCESS_TOKEN manquant',
        missing_base_id: 'Identifiant AIRTABLE_BASE_ID manquant',
        invalid_credentials: 'Identifiants Airtable invalides (HTTP 401)',
        insufficient_permissions: 'Permissions Airtable insuffisantes (HTTP 403)',
        base_or_table_not_found: 'Base ou table Airtable introuvable (HTTP 404)',
        network_error: 'Erreur réseau API Airtable',
        connected: 'Connexion API Airtable vérifiée',
        not_probed: 'Non testé',
        allowAdminDeleteLabel: 'Autoriser les Admins (en plus du Super Admin) à supprimer définitivement un rendez-vous',
      },
      errors: {
        sessionExpired: 'Votre session administrateur a expiré ou est non authentifiée (HTTP 401). Veuillez vous reconnecter.',
        cookieBlocked: 'Identifiants acceptés, mais votre navigateur bloque les cookies de session dans cet aperçu intégré. Autorisez les cookies pour ce site ou ouvrez l’application dans un nouvel onglet (même origine).',
        loadFailed: 'Impossible de charger les données depuis le serveur. Veuillez réessayer.',
      },
    },
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      services: 'Services',
      contact: 'Contact',
      bookNow: 'Book Appointment',
      adminPortal: 'Staff Portal',
    },
    hero: {
      kicker: 'Medical-Aesthetic & Physiotherapy Clinic · Casablanca',
      headline: 'WHERE YOUR BODY FINDS ITS HARMONY.',
      subheadline:
        'A clinic where science and well-being meet to reveal the very best version of you.',
      primaryCta: 'Book Appointment',
      secondaryCta: 'Explore Treatments',
      locationLabel: 'Racine, Casablanca',
    },
    welcome: {
      eyebrow: 'Welcome to EMIE CLINIC',
      title: 'Personalized clinical care in the heart of Casablanca',
      paragraph1:
        'Located in the heart of Casablanca, Emie Clinic specializes in physiotherapy & osteopathy, non-invasive slimming, cupping / Hijama, and advanced facial care.',
      paragraph2:
        'Combining comfort and clinical professionalism, our qualified team welcomes you for safe, personalized treatments.',
    },
    about: {
      eyebrow: 'EMIE CLINIC',
      title: 'Excellence dedicated to your beauty and well-being.',
      lead: 'At Emie Clinic, beyond each treatment, we are committed to a complete experience:',
      pillars: [
        {
          title: 'Physiotherapy & Osteopathy',
          detail: 'Relieve, rehabilitate, rebalance.',
        },
        {
          title: 'Non-Invasive Slimming',
          detail: 'Contour your silhouette without surgery.',
        },
        {
          title: 'Cupping / Hijama',
          detail: 'Release deep tension and support recovery.',
        },
        {
          title: 'Facial Care',
          detail: 'Purify, hydrate, and illuminate your skin.',
        },
      ],
      closing:
        'All within a calm, modern environment thoughtfully designed for your well-being. Your body deserves more than a treatment: a genuine transformation.',
    },
    servicesSection: {
      eyebrow: 'Our Specialties',
      title: 'Five clinical care pillars tailored to your balance',
      subtitle:
        'Every protocol is adapted to your goals through individual care by our specialists.',
      bookService: 'Request Appointment',
      durationUnit: 'min',
      officialDescriptions: {
        kinesitherapie: {
          name: 'Physiotherapy',
          description:
            'Post-injury rehabilitation, chronic pain relief, and physical recovery optimization supervised by our specialists.',
        },
        osteopathie: {
          name: 'Osteopathy',
          description:
            'Osteopathy aims to restore overall body balance by addressing muscular, joint, and visceral tensions.',
        },
        amincissement: {
          name: 'Body Slimming',
          description:
            'Reshape your silhouette without surgery using advanced, sustainable aesthetic techniques.',
        },
        cupping: {
          name: 'Cupping / Hijama',
          description:
            'A targeted manual technique to release deep tissue tension, stimulate circulation, and support muscular recovery.',
        },
        'soins-du-visage': {
          name: 'Facial Care',
          description:
            'Combining aesthetic technology and expert manual care to cleanse, hydrate, smooth, and revive your skin’s natural glow.',
        },
      },
    },
    whyChoose: {
      eyebrow: 'Our Commitment',
      title: 'Why choose EMIE CLINIC',
      items: [
        {
          number: '01',
          title: 'Science & Well-being',
          description:
            'Integrated care combining physiotherapy, osteopathy, and non-invasive medical aesthetics under one roof.',
        },
        {
          number: '02',
          title: 'Non-Surgical Protocols',
          description:
            'Advanced slimming and facial care techniques designed to work harmoniously with your body without surgery.',
        },
        {
          number: '03',
          title: 'Calm Setting in Racine',
          description:
            'Located on the 7th floor of Prince Bureaux on Boulevard Mohamed Zerktouni, offering a serene and private clinic environment.',
        },
        {
          number: '04',
          title: 'Personal Confirmation',
          description:
            'Every appointment request is reviewed and personally confirmed by our clinic team to secure your preferred slot.',
        },
      ],
    },
    ctaBand: {
      title: 'Not sure which treatment suits you best?',
      subtitle:
        'Book an appointment for a personalized assessment with our medical-aesthetic specialists.',
      button: 'Request an Appointment',
    },
    contact: {
      eyebrow: 'Contact & Location',
      title: 'Visit us in Casablanca',
      addressLabel: 'Address',
      phoneLabel: 'Appointment Line',
      hoursLabel: 'Opening Hours',
      hoursNotConfigured: 'Confirmed directly by our reception team.',
      instagramLabel: 'Instagram',
      instagramTitle: 'Follow @emieclinic on Instagram',
      instagramBody:
        'Discover life at the clinic, our treatment protocols, and daily guidance from our specialists.',
      instagramCta: 'Open @emieclinic',
    },
    footer: {
      rights: 'EMIE CLINIC — All rights reserved.',
      privacyNotice: 'Personal data handled confidentially in line with Moroccan Law 09-08.',
      staffAccess: 'Administration',
      manageBooking: 'Manage My Booking',
    },
    selfService: {
      title: 'Manage My Appointment',
      subtitle:
        'Verify your booking using your reference code and associated phone number or email.',
      bookingRef: 'Booking reference (e.g. EMIE-20261118-A1B2)',
      contact: 'Phone number or email associated with your booking',
      contactPlaceholder: '+212 6... or name@example.com',
      lookupBtn: 'Access My Appointment',
      searching: 'Verifying...',
      anotherLookup: 'Look up another appointment',
      referenceLabel: 'Reference',
      service: 'Treatment',
      currentSlot: 'Current Slot',
      practitioner: 'Practitioner',
      anyPractitioner: 'No preference (first available)',
      status: 'Status',
      requestReschedule: 'Modify Appointment',
      requestCancel: 'Cancel Appointment',
      selectService: 'Treatment / Service',
      selectPractitioner: 'Available Practitioner (optional)',
      newDate: 'New Date',
      newTime: 'New Time Slot',
      checkingAvailability: 'Checking slot availability...',
      unavailableSlotTag: 'Unavailable',
      noSlotsAvailable:
        'No time slots are available for this date. Please choose another date.',
      reason: 'Note or reason (optional)',
      modifyReasonPlaceholder: 'e.g. schedule conflict',
      submitRequest: 'Save Appointment Changes',
      submitting: 'Saving changes...',
      modifySuccessTitle: 'Appointment Updated',
      modifySuccessBody:
        'Your appointment has been updated in our clinic schedule and reception has been notified.',
      cancelWarningTitle: 'Cancellation Confirmation',
      cancelWarningBody:
        'Important: cancelling this appointment online cannot be undone. To book again later, you will need to create a new appointment request.',
      cancelReasonLabel: 'Cancellation reason (optional)',
      cancelReasonPlaceholder: 'e.g. personal schedule conflict',
      cancelAcknowledge: 'I understand that this cancellation cannot be undone and want to cancel my appointment.',
      confirmCancelBtn: 'Confirm Cancellation',
      cancellingBtn: 'Cancelling...',
      cancelSuccessTitle: 'Appointment Cancelled',
      cancelSuccessBody:
        'Your appointment has been cancelled and EMIE CLINIC reception has been notified.',
      lockedStatus: 'This appointment can no longer be modified or cancelled online. Please call our reception team.',
      noChangesError: 'Please change the date, time, service, or practitioner before saving.',
      slotUnavailableError: 'This time slot is unavailable. Please choose another available slot.',
      notFoundError: 'No appointment matches this booking reference and contact detail.',
      missingFieldsError: 'Please enter both your booking reference and your phone number or email.',
      invalidScheduleError: 'Please choose a valid upcoming date and clinic time slot.',
      deadlinePassedError: 'The online change or cancellation deadline for this appointment has passed. Please call our reception team.',
      cancelConfirmRequiredError: 'Please confirm that you want to cancel your appointment.',
      deadlineNotice: 'Clinic online change window:',
      close: 'Close',
    },
    booking: {
      title: 'Appointment Request',
      subtitle:
        'Complete your request in a few steps. Our clinic team will confirm your final time slot.',
      steps: ['Service', 'Your Info', 'Schedule', 'Review', 'Submitted'],
      selectServicePrompt: 'Select your desired treatment:',
      fullName: 'Full name',
      phone: 'Phone number',
      email: 'Email address',
      emailOptionalHint: 'Optional',
      preferredLanguage: 'Preferred language',
      preferredDate: 'Preferred date',
      preferredTime: 'Preferred time',
      checkingAvailability: 'Checking slot availability...',
      unavailableSlotTag: 'Unavailable',
      noSlotsAvailable:
        'No time slots are available for this date. Please choose another date.',
      alternativeDate: 'Alternative date',
      alternativeTime: 'Alternative time',
      optionalLabel: 'Optional',
      message: 'Additional message',
      messagePlaceholder:
        'Share availability notes or general questions (please avoid sensitive medical history).',
      reviewTitle: 'Review your details before submitting',
      reviewNotice:
        'Please note: submitting this form creates an appointment request. Your booking is only confirmed once approved by an authorized administrator.',
      consentText:
        'I consent to EMIE CLINIC processing my contact details solely to coordinate this appointment request, in accordance with confidentiality standards and Law 09-08.',
      back: 'Back',
      next: 'Continue',
      edit: 'Edit',
      submit: 'Submit Request',
      submitting: 'Submitting...',
      successTitle: 'Request Submitted Successfully',
      successBody:
        'Your request is currently Pending Confirmation. Our reception team will reach out shortly.',
      referenceLabel: 'Booking Reference',
      statusPendingBadge: 'Pending Confirmation',
      newBooking: 'New Request',
      close: 'Close',
      errors: {
        selectService: 'Please select a service.',
        fullNameRequired: 'Please enter your full name.',
        phoneInvalid: 'Please enter a valid phone number.',
        emailRequired: 'Email address is required.',
        emailInvalid: 'Email address format is invalid.',
        dateRequired: 'Please choose a preferred date.',
        timeRequired: 'Please choose a preferred time.',
        consentRequired: 'Consent is required before submitting your request.',
        slotConflict:
          'This time slot is unavailable. Please select another available date and time.',
        airtableMissing:
          'Airtable database credentials (AIRTABLE_ACCESS_TOKEN / AIRTABLE_BASE_ID) are not configured on the server yet. Your form inputs have been preserved.',
        generic: 'Unable to submit your request right now. Your entered information has been preserved.',
      },
    },
    statuses: {
      'New Request': 'New Request',
      'Pending Confirmation': 'Pending Confirmation',
      Confirmed: 'Confirmed',
      Rescheduled: 'Rescheduled',
      Completed: 'Completed',
      Cancelled: 'Cancelled',
      'No Show': 'No Show',
    },
    admin: {
      loginTitle: 'EMIE CLINIC Administration Portal',
      loginSubtitle: 'Restricted to authorized administrators and clinical staff.',
      email: 'Email address',
      password: 'Password',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      backToWebsite: 'Back to Public Website',
      setupTitle: 'Initial Super Admin Setup',
      setupSubtitle: 'Provision the first Super Admin account using the server setup token.',
      setupToken: 'Setup Token (ADMIN_SETUP_TOKEN)',
      fullName: 'Full name',
      createSuperAdmin: 'Create Super Admin',
      logout: 'Sign Out',
      nav: {
        overview: 'Overview',
        appointments: 'Appointments',
        calendar: 'Calendar',
        clients: 'Clients',
        services: 'Services',
        staff: 'Staff',
        notifications: 'Notifications',
        reports: 'Reports',
        settings: 'Settings',
      },
      kpis: {
        totalAppointments: 'Total Appointments',
        newRequests: 'New Requests',
        pendingConfirmations: 'Pending Confirmation',
        confirmed: 'Confirmed',
        today: 'Today',
        upcoming: 'Upcoming',
        completed: 'Completed',
        cancelled: 'Cancelled',
        totalClients: 'Total Clients',
      },
      common: {
        search: 'Search...',
        filterStatus: 'Status',
        filterService: 'Service',
        all: 'All',
        dateFrom: 'From',
        dateTo: 'To',
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',
        reschedule: 'Reschedule',
        reject: 'Cancel Appt',
        details: 'Details',
        actions: 'Actions',
        noRecords: 'No records found.',
        loading: 'Loading Airtable data...',
        refresh: 'Refresh',
        refreshing: 'Refreshing...',
        retry: 'Retry',
        exportCsv: 'Export CSV',
        retryWebhook: 'Retry Make.com',
        internalNotes: 'Private Internal Notes',
        assignedStaff: 'Assigned Staff',
        unassigned: 'Unassigned',
        active: 'Active',
        inactive: 'Inactive',
        awaitingConfigTitle: 'Airtable Configuration Required',
        awaitingConfigDesc:
          'No Airtable database is connected yet. Configure AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID on the server to enable live records.',
      },
      appointments: {
        edit: 'Edit',
        delete: 'Delete',
        history: 'Activity History',
        noHistory: 'No changes logged for this appointment yet.',
        loadingHistory: 'Loading history...',
        clientName: 'Client Full Name',
        clientPhone: 'Client Phone',
        clientEmail: 'Client Email',
        clientLanguage: 'Client Preferred Language',
        service: 'Service',
        preferredDate: 'Preferred Date',
        preferredTime: 'Preferred Time',
        alternativeDate: 'Alternative Date',
        alternativeTime: 'Alternative Time',
        clientMessage: 'Client Message',
        cancellationReason: 'Cancellation Reason',
        rescheduleReason: 'Reschedule Reason (optional)',
        deleteReason: 'Deletion Reason (recorded in audit log)',
        previousSlot: 'Previous Slot',
        newSlot: 'New Slot',
        staffAvailability: 'Practitioner Availability',
        editSuccess: 'Appointment updated in Airtable.',
        rescheduleSuccess: 'Appointment rescheduled and saved in Airtable.',
        cancelSuccess: 'Appointment cancelled with record preserved.',
        deleteSuccess: 'Appointment permanently deleted from Airtable.',
        confirmCancelTitle: 'Confirm Appointment Cancellation',
        confirmCancelDesc:
          'The appointment record and history will be preserved in Airtable with status Cancelled.',
        confirmRescheduleTitle: 'Confirm Reschedule',
        confirmRescheduleDesc:
          'Previous date/time will be saved in activity history and Make.com will be triggered after saving.',
        confirmDeleteTitle: 'Permanently Delete Appointment',
        confirmDeleteWarning:
          'Warning: This permanently deletes the appointment record from Airtable and cannot be undone. The linked client profile is preserved and an audit log is written prior to deletion.',
        confirmationDate: 'Confirmed on',
        noSlotsAvailable:
          'No time slots are available for this date. Please choose another date.',
        slotOccupiedWarning:
          'This slot overlaps with an existing confirmed appointment. Please select another time.',
        reminderSent: 'Reminder sent',
        reminderNotSent: 'Reminder pending',
        saveChanges: 'Save Changes',
      },
      diagnostics: {
        missing_token: 'Missing AIRTABLE_ACCESS_TOKEN',
        missing_base_id: 'Missing AIRTABLE_BASE_ID',
        invalid_credentials: 'Invalid Airtable Credentials (HTTP 401)',
        insufficient_permissions: 'Insufficient Airtable Permissions (HTTP 403)',
        base_or_table_not_found: 'Airtable Base or Table Not Found (HTTP 404)',
        network_error: 'Airtable API Network Error',
        connected: 'Airtable API Verified',
        not_probed: 'Not Probed Yet',
        allowAdminDeleteLabel: 'Allow Admins (in addition to Super Admin) to permanently delete appointments',
      },
      errors: {
        sessionExpired: 'Your administrator session has expired or is unauthenticated (HTTP 401). Please sign in again.',
        cookieBlocked: 'Credentials were accepted, but your browser blocked the session cookie inside this embedded preview. Allow cookies for this site or open the app in a dedicated browser tab.',
        loadFailed: 'Unable to load dashboard data from the server. Please retry.',
      },
    },
  },
  ar: {
    nav: {
      home: 'الرئيسية',
      about: 'من نحن',
      services: 'خدماتنا',
      contact: 'اتصل بنا',
      bookNow: 'احجز موعداً',
      adminPortal: 'بوابة الإدارة',
    },
    hero: {
      kicker: 'عيادة التجميل الطبي والترويض الطبي · الدار البيضاء',
      headline: 'هنا، يستعيد الجسم توازنه وانسجامه.',
      subheadline: 'عيادة يلتقي فيها العلم والرفاهية لإبراز أفضل ما لديك.',
      primaryCta: 'احجز موعداً',
      secondaryCta: 'اكتشف علاجاتنا',
      locationLabel: 'راسين، الدار البيضاء',
    },
    welcome: {
      eyebrow: 'مرحباً بكم في EMIE CLINIC',
      title: 'عناية طبية وتجميلية مخصصة في قلب الدار البيضاء',
      paragraph1:
        'تقع عيادة إيمي كلينيك في قلب الدار البيضاء، وتتخصص في الترويض الطبي وتقويم العظام، التخسيس غير الجراحي، الحجامة العلاجية، والعناية المتقدمة بالوجه.',
      paragraph2:
        'يجمع فريقنا المؤهل بين الراحة والاحترافية لاستقبالكم وتقديم علاجات آمنة ومخصصة لاحتياجاتكم.',
    },
    about: {
      eyebrow: 'EMIE CLINIC',
      title: 'التميز في خدمة جمالكم وعافيتكم.',
      lead: 'في عيادة إيمي كلينيك، التزامنا يتجاوز العلاج ليمنحكم تجربة متكاملة:',
      pillars: [
        {
          title: 'الترويض الطبي وتقويم العظام',
          detail: 'تخفيف الآلام، إعادة التأهيل، واستعادة التوازن.',
        },
        {
          title: 'التخسيس غير الجراحي',
          detail: 'نحت القوام بتقنيات حديثة بدون جراحة.',
        },
        {
          title: 'الحجامة / Cupping',
          detail: 'تخفيف التوتر العضلي وتحفيز الدورة الدموية والتعافي.',
        },
        {
          title: 'العناية بالوجه',
          detail: 'تنظيف عميق، ترطيب، وإشراقة طبيعية للبشرة.',
        },
      ],
      closing:
        'كل ذلك في فضاء عصري وهادئ صُمم لراحتكم. جسمكم يستحق أكثر من مجرد عناية: يستحق تحولاً حقيقياً.',
    },
    servicesSection: {
      eyebrow: 'تخصصاتنا',
      title: 'خمسة أقطاب علاجية متكاملة لتوازنكم',
      subtitle: 'يتم تكييف كل بروتوكول علاجي حسب حالتكم بإشراف مباشر من أخصائيي العيادة.',
      bookService: 'طلب موعد',
      durationUnit: 'دقيقة',
      officialDescriptions: {
        kinesitherapie: {
          name: 'الترويض الطبي (Kinésithérapie)',
          description:
            'إعادة التأهيل بعد الإصابات، تخفيف الآلام المزمنة، وتحسين التعافي البدني بإشراف أخصائيينا.',
        },
        osteopathie: {
          name: 'تقويم العظام (Ostéopathie)',
          description:
            'يهدف تقويم العظام إلى استعادة التوازن الشامل للجسم عبر معالجة التوترات العضلية والمفصلية والباطنية.',
        },
        amincissement: {
          name: 'التخسيس ونحت القوام',
          description:
            'أعيدوا رسم قوامكم بدون جراحة بفضل تقنيات تجميلية متقدمة ومستدامة.',
        },
        cupping: {
          name: 'الحجامة (Cupping / Hijama)',
          description:
            'تقنية يدوية فعالة لإرخاء الأنسجة العميقة، تنشيط الدورة الدموية، وتعزيز التعافي العضلي.',
        },
        'soins-du-visage': {
          name: 'العناية بالوجه',
          description:
            'الجمع بين التكنولوجيا التجميلية واللمسة الخبيرة لتنظيف وترطيب وتنعيم البشرة وإعادة إشراقتها الطبيعية.',
        },
      },
    },
    whyChoose: {
      eyebrow: 'التزامنا',
      title: 'لماذا تختارون EMIE CLINIC',
      items: [
        {
          number: '01',
          title: 'العلم والرفاهية',
          description:
            'رعاية متكاملة تجمع بين الترويض الطبي وتقويم العظام والعناية التجميلية غير الجراحية في مكان واحد.',
        },
        {
          number: '02',
          title: 'علاجات بدون جراحة',
          description:
            'بروتوكولات متطورة للتخسيس والعناية بالبشرة تحترم طبيعة الجسم دون أي تدخل جراحي.',
        },
        {
          number: '03',
          title: 'فضاء هادئ في حي راسين',
          description:
            'تقع العيادة في الطابق السابع من إقامة برانس بشارع محمد الزرقطوني، وتوفر أجواءً هادئة وخاصة.',
        },
        {
          number: '04',
          title: 'تأكيد شخصي للمواعيد',
          description:
            'تتم مراجعة كل طلب حجز وتأكيده مباشرة من طرف فريقنا لضمان الموعد المناسب لكم.',
        },
      ],
    },
    ctaBand: {
      title: 'لستم متأكدين من العلاج الأنسب لكم؟',
      subtitle: 'احجزوا موعداً لتشخيص مخصص مع خبرائنا في التجميل الطبي والترويض.',
      button: 'طلب موعد',
    },
    contact: {
      eyebrow: 'التواصل والموقع',
      title: 'زورونا في الدار البيضاء',
      addressLabel: 'العنوان',
      phoneLabel: 'حجز المواعيد',
      hoursLabel: 'ساعات العمل',
      hoursNotConfigured: 'يتم تأكيدها عند الاتصال بفريق الاستقبال.',
      instagramLabel: 'إنستغرام',
      instagramTitle: 'تابعوا @emieclinic على إنستغرام',
      instagramBody: 'اكتشفوا أجواء العيادة وبروتوكولات العناية ونصائح فريقنا اليومية.',
      instagramCta: 'زيارة @emieclinic',
    },
    footer: {
      rights: 'EMIE CLINIC — جميع الحقوق محفوظة.',
      privacyNotice: 'تُعالج البيانات الشخصية بسرية تامة وفقاً للقانون المغربي 09-08.',
      staffAccess: 'إدارة العيادة',
      manageBooking: 'إدارة موعدي',
    },
    selfService: {
      title: 'إدارة موعدي',
      subtitle: 'تحققوا من موعدكم باستخدام رمز المرجع ورقم الهاتف أو البريد الإلكتروني المرتبط بالحجز.',
      bookingRef: 'مرجع الحجز (مثال: EMIE-20261118-A1B2)',
      contact: 'رقم الهاتف أو البريد الإلكتروني المرتبط بالموعد',
      contactPlaceholder: '+212 6... أو name@example.com',
      lookupBtn: 'الدخول إلى موعدي',
      searching: 'جاري التحقق...',
      anotherLookup: 'البحث عن موعد آخر',
      referenceLabel: 'المرجع',
      service: 'الخدمة',
      currentSlot: 'الموعد الحالي',
      practitioner: 'الأخصائي',
      anyPractitioner: 'بدون تفضيل (أول أخصائي متاح)',
      status: 'الحالة',
      requestReschedule: 'تعديل الموعد',
      requestCancel: 'إلغاء الموعد',
      selectService: 'الخدمة المطلوبة',
      selectPractitioner: 'الأخصائي المتاح (اختياري)',
      newDate: 'التاريخ الجديد',
      newTime: 'الوقت الجديد',
      checkingAvailability: 'جاري التحقق من توفر المواعيد...',
      unavailableSlotTag: 'غير متاح',
      noSlotsAvailable: 'لا توجد أوقات متاحة في هذا التاريخ. يرجى اختيار تاريخ آخر.',
      reason: 'ملاحظة أو سبب (اختياري)',
      modifyReasonPlaceholder: 'مثال: تغيير في الجدول الزمني',
      submitRequest: 'حفظ التعديلات',
      submitting: 'جاري الحفظ...',
      modifySuccessTitle: 'تم تحديث الموعد بنجاح',
      modifySuccessBody:
        'تم تعديل موعدكم بنجاح في جدول العيادة وتم إشعار فريق الاستقبال.',
      cancelWarningTitle: 'تأكيد إلغاء الموعد',
      cancelWarningBody:
        'تنبيه هام: إلغاء الموعد عبر الإنترنت إجراء نهائي لا يمكن التراجع عنه من هذا الفضاء. لحجز موعد آخر مستقبلاً سيتعين عليكم تقديم طلب حجز جديد.',
      cancelReasonLabel: 'سبب الإلغاء (اختياري)',
      cancelReasonPlaceholder: 'مثال: ظرف شخصي طارئ',
      cancelAcknowledge: 'أفهم أن هذا الإلغاء نهائي ولا يمكن التراجع عنه وأؤكد رغبتي في إلغاء الموعد.',
      confirmCancelBtn: 'تأكيد الإلغاء',
      cancellingBtn: 'جاري الإلغاء...',
      cancelSuccessTitle: 'تم إلغاء الموعد',
      cancelSuccessBody:
        'تم إلغاء موعدكم بنجاح وإبلاغ فريق استقبال EMIE CLINIC.',
      lockedStatus: 'لم يعد بالإمكان تعديل هذا الموعد أو إلغاؤه عبر الإنترنت. يرجى الاتصال بفريق الاستقبال.',
      noChangesError: 'يرجى تغيير التاريخ أو الوقت أو الخدمة أو الأخصائي قبل الحفظ.',
      slotUnavailableError: 'هذا الموعد غير متاح حالياً. يرجى اختيار وقت أو تاريخ آخر.',
      notFoundError: 'لا يوجد موعد مطابق لرقم المرجع ومعلومات الاتصال المدخلة.',
      missingFieldsError: 'يرجى إدخال مرجع الحجز ورقم الهاتف أو البريد الإلكتروني.',
      invalidScheduleError: 'يرجى اختيار تاريخ ووقت قادمين وصالحين ضمن أوقات العيادة.',
      deadlinePassedError: 'انتهت المهلة المسموح بها لتعديل أو إلغاء هذا الموعد عبر الإنترنت. يرجى الاتصال بفريق الاستقبال.',
      cancelConfirmRequiredError: 'يرجى تأكيد خانة الموافقة قبل إلغاء الموعد.',
      deadlineNotice: 'المهلة المحددة للتعديل عبر الإنترنت:',
      close: 'إغلاق',
    },
    booking: {
      title: 'طلب حجز موعد',
      subtitle: 'أكملوا طلبكم في خطوات بسيطة. سيقوم فريق العيادة بتأكيد الموعد النهائي معكم.',
      steps: ['الخدمة', 'المعلومات', 'التوقيت', 'المراجعة', 'التأكيد'],
      selectServicePrompt: 'اختر الخدمة المطلوبة:',
      fullName: 'الاسم الكامل',
      phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      emailOptionalHint: 'اختياري',
      preferredLanguage: 'اللغة المفضلة',
      preferredDate: 'التاريخ المفضل',
      preferredTime: 'الوقت المفضل',
      checkingAvailability: 'جاري التحقق من توفر المواعيد...',
      unavailableSlotTag: 'غير متاح',
      noSlotsAvailable: 'لا توجد أوقات متاحة في هذا التاريخ. يرجى اختيار تاريخ آخر.',
      alternativeDate: 'تاريخ بديل',
      alternativeTime: 'وقت بديل',
      optionalLabel: 'اختياري',
      message: 'رسالة إضافية',
      messagePlaceholder: 'اذكروا تفضيلات التوقيت أو أي استفسار عام (دون تفاصيل طبية حساسة).',
      reviewTitle: 'راجعوا بيانات الطلب قبل الإرسال',
      reviewNotice:
        'ملاحظة هامة: إرسال هذا النموذج يُسجل طلب موعد فقط. لا يصبح الموعد مؤكداً إلا بعد موافقة الإدارة.',
      consentText:
        'أوافق على قيام EMIE CLINIC بمعالجة بيانات الاتصال الخاصة بي فقط لتنظيم هذا الموعد، وفقاً لسياسة السرية والقانون 09-08.',
      back: 'رجوع',
      next: 'متابعة',
      edit: 'تعديل',
      submit: 'إرسال الطلب',
      submitting: 'جاري الإرسال...',
      successTitle: 'تم تسجيل طلبكم بنجاح',
      successBody: 'طلبكم حالياً قيد انتظار التأكيد. سيتواصل معكم فريق الاستقبال قريباً.',
      referenceLabel: 'رقم مرجع الحجز',
      statusPendingBadge: 'في انتظار التأكيد',
      newBooking: 'طلب موعد جديد',
      close: 'إغلاق',
      errors: {
        selectService: 'يرجى اختيار الخدمة المطلوبة.',
        fullNameRequired: 'يرجى إدخال الاسم الكامل.',
        phoneInvalid: 'يرجى إدخال رقم هاتف صحيح.',
        emailRequired: 'البريد الإلكتروني مطلوب.',
        emailInvalid: 'صيغة البريد الإلكتروني غير صحيحة.',
        dateRequired: 'يرجى اختيار التاريخ المفضل.',
        timeRequired: 'يرجى اختيار الوقت المفضل.',
        consentRequired: 'الموافقة مطلوبة قبل إرسال الطلب.',
        slotConflict: 'هذا الموعد غير متاح حالياً. يرجى اختيار تاريخ ووقت آخرين.',
        airtableMissing:
          'قاعدة بيانات Airtable غير مهيأة بعد على الخادم (AIRTABLE_ACCESS_TOKEN / AIRTABLE_BASE_ID). تم الاحتفاظ ببياناتكم المدخلة.',
        generic: 'تعذر إرسال الطلب حالياً. تم الاحتفاظ بجميع بياناتكم المدخلة.',
      },
    },
    statuses: {
      'New Request': 'طلب جديد',
      'Pending Confirmation': 'في انتظار التأكيد',
      Confirmed: 'مؤكد',
      Rescheduled: 'أُعيد جدولته',
      Completed: 'مكتمل',
      Cancelled: 'ملغى',
      'No Show': 'لم يحضر',
    },
    admin: {
      loginTitle: 'بوابة إدارة EMIE CLINIC',
      loginSubtitle: 'دخول مخصص للمسؤولين والممارسين المصرح لهم فقط.',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      signIn: 'تسجيل الدخول',
      signingIn: 'جاري الدخول...',
      backToWebsite: 'العودة إلى الموقع العام',
      setupTitle: 'الإعداد الأولي للمشرف العام',
      setupSubtitle: 'إنشاء أول حساب مشرف عام باستخدام رمز التهيئة المحمي على الخادم.',
      setupToken: 'رمز الإعداد (ADMIN_SETUP_TOKEN)',
      fullName: 'الاسم الكامل',
      createSuperAdmin: 'إنشاء حساب المشرف العام',
      logout: 'تسجيل الخروج',
      nav: {
        overview: 'نظرة عامة',
        appointments: 'المواعيد',
        calendar: 'التقويم',
        clients: 'العملاء',
        services: 'الخدمات',
        staff: 'الفريق',
        notifications: 'الإشعارات',
        reports: 'التقارير',
        settings: 'الإعدادات',
      },
      kpis: {
        totalAppointments: 'إجمالي المواعيد',
        newRequests: 'طلبات جديدة',
        pendingConfirmations: 'قيد التأكيد',
        confirmed: 'مؤكدة',
        today: 'اليوم',
        upcoming: 'القادمة',
        completed: 'مكتملة',
        cancelled: 'ملغاة',
        totalClients: 'إجمالي العملاء',
      },
      common: {
        search: 'بحث...',
        filterStatus: 'الحالة',
        filterService: 'الخدمة',
        all: 'الكل',
        dateFrom: 'من',
        dateTo: 'إلى',
        save: 'حفظ',
        cancel: 'إلغاء',
        confirm: 'تأكيد',
        reschedule: 'إعادة جدولة',
        reject: 'إلغاء الموعد',
        details: 'التفاصيل',
        actions: 'الإجراءات',
        noRecords: 'لا توجد سجلات.',
        loading: 'جاري تحميل البيانات من Airtable...',
        refresh: 'تحديث',
        refreshing: 'جاري التحديث...',
        retry: 'إعادة المحاولة',
        exportCsv: 'تصدير CSV',
        retryWebhook: 'إعادة إرسال Make.com',
        internalNotes: 'ملاحظات داخلية سرية',
        assignedStaff: 'الأخصائي المعين',
        unassigned: 'غير معين',
        active: 'نشط',
        inactive: 'غير نشط',
        awaitingConfigTitle: 'يتطلب إعداد Airtable',
        awaitingConfigDesc:
          'لم يتم ربط قاعدة بيانات Airtable بعد. يرجى ضبط AIRTABLE_ACCESS_TOKEN و AIRTABLE_BASE_ID على الخادم.',
      },
      appointments: {
        edit: 'تعديل',
        delete: 'حذف نهائي',
        history: 'سجل النشاط',
        noHistory: 'لا توجد تعديلات مسجلة لهذا الموعد بعد.',
        loadingHistory: 'جاري تحميل السجل...',
        clientName: 'اسم العميل الكامل',
        clientPhone: 'هاتف العميل',
        clientEmail: 'بريد العميل الإلكتروني',
        clientLanguage: 'لغة العميل المفضلة',
        service: 'الخدمة',
        preferredDate: 'التاريخ المفضل',
        preferredTime: 'الوقت المفضل',
        alternativeDate: 'التاريخ البديل',
        alternativeTime: 'الوقت البديل',
        clientMessage: 'رسالة العميل',
        cancellationReason: 'سبب الإلغاء',
        rescheduleReason: 'سبب إعادة الجدولة (اختياري)',
        deleteReason: 'سبب الحذف (يُحفظ في سجل التدقيق)',
        previousSlot: 'الموعد السابق',
        newSlot: 'الموعد الجديد',
        staffAvailability: 'توفر الأخصائي',
        editSuccess: 'تم تحديث الموعد في Airtable بنجاح.',
        rescheduleSuccess: 'تمت إعادة جدولة الموعد وحفظه في Airtable.',
        cancelSuccess: 'تم إلغاء الموعد مع الاحتفاظ بالسجل والتاريخ.',
        deleteSuccess: 'تم حذف الموعد نهائياً من Airtable.',
        confirmCancelTitle: 'تأكيد إلغاء الموعد',
        confirmCancelDesc: 'سيتم الاحتفاظ بسجل الموعد وتاريخه في Airtable بحالة ملغى.',
        confirmRescheduleTitle: 'تأكيد إعادة الجدولة',
        confirmRescheduleDesc:
          'سيتم حفظ الموعد السابق في السجل وإرسال إشعار Make.com بعد نجاح الحفظ.',
        confirmDeleteTitle: 'حذف الموعد نهائياً',
        confirmDeleteWarning:
          'تحذير: سيؤدي هذا الإجراء إلى حذف سجل الموعد نهائياً من Airtable ولا يمكن التراجع عنه. سيتم الاحتفاظ بملف العميل وتسجيل نسخة في سجل التدقيق قبل الحذف.',
        confirmationDate: 'تاريخ التأكيد',
        noSlotsAvailable: 'لا توجد أوقات متاحة في هذا التاريخ. يرجى اختيار تاريخ آخر.',
        slotOccupiedWarning: 'هذا التوقيت محجوز لموعد مؤكد آخر. يرجى اختيار وقت آخر.',
        reminderSent: 'تم إرسال التذكير',
        reminderNotSent: 'التذكير قيد الانتظار',
        saveChanges: 'حفظ التعديلات',
      },
      diagnostics: {
        missing_token: 'رمز AIRTABLE_ACCESS_TOKEN مفقود',
        missing_base_id: 'معرف AIRTABLE_BASE_ID مفقود',
        invalid_credentials: 'بيانات اعتماد Airtable غير صالحة (HTTP 401)',
        insufficient_permissions: 'صلاحيات Airtable غير كافية (HTTP 403)',
        base_or_table_not_found: 'قاعدة البيانات أو الجدول غير موجود (HTTP 404)',
        network_error: 'خطأ في شبكة Airtable API',
        connected: 'تم التحقق من اتصال Airtable API',
        not_probed: 'لم يتم الفحص بعد',
        allowAdminDeleteLabel: 'السماح للمسؤولين (Admin) بحذف المواعيد نهائياً بالإضافة إلى المشرف العام',
      },
      errors: {
        sessionExpired: 'انتهت صلاحية جلسة الإدارة أو لم يتم التحقق من المصادقة (HTTP 401). يرجى تسجيل الدخول مجدداً.',
        cookieBlocked: 'تم التحقق من بيانات الدخول، لكن المتصفح منع حفظ أو إرسال ملف تعريف الجلسة داخل الإطار المضمّن. يرجى السماح بملفات تعريف الارتباط لهذا الموقع أو فتح التطبيق في نافذة مستقلة.',
        loadFailed: 'تعذر تحميل بيانات لوحة التحكم من الخادم. يرجى إعادة المحاولة.',
      },
    },
  },
};
