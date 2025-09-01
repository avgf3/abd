export interface Translation {
  // Header and Navigation
  appTitle: string;
  settings: string;
  notifications: string;
  friends: string;
  messages: string;
  moderation: string;
  reports: string;
  actions: string;
  promote: string;
  ownerPanel: string;

  // Chat Interface
  publicChat: string;
  privateMessage: string;
  sendMessage: string;
  typing: string;
  online: string;
  offline: string;

  // User Actions
  profile: string;
  viewProfile: string;
  editProfile: string;
  addFriend: string;
  removeFriend: string;
  blockUser: string;
  reportUser: string;
  ignoreUser: string;

  // Profile Fields
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  country: string;
  city: string;
  bio: string;
  status: string;

  // Authentication
  login: string;
  logout: string;
  register: string;
  guest: string;
  member: string;

  // Common Actions
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  close: string;
  confirm: string;

  // Status Messages
  welcome: string;
  connected: string;
  disconnected: string;
  messageReceived: string;
  friendRequestSent: string;
  friendRequestReceived: string;

  // User Types
  owner: string;
  admin: string;
  moderator: string;

  // Time and Dates
  joinedAt: string;
  lastSeen: string;
  now: string;
  today: string;
  yesterday: string;
}

export const translations: Record<string, Translation> = {
  ar: {
    // Header and Navigation
    appTitle: 'دردشة عربية',
    settings: 'إعدادات',
    notifications: 'إشعارات',
    friends: 'الأصدقاء',
    messages: 'الرسائل',
    moderation: 'إدارة',
    reports: 'سجل البلاغات',
    actions: 'سجل الإجراءات النشطة',
    promote: 'ترقية المستخدمين',
    ownerPanel: 'إدارة المالك',

    // Chat Interface
    publicChat: 'الدردشة العامة',
    privateMessage: 'رسالة خاصة',
    sendMessage: 'إرسال رسالة',
    typing: 'يكتب...',
    online: 'متصل',
    offline: 'غير متصل',

    // User Actions
    profile: 'الملف الشخصي',
    viewProfile: 'عرض الملف الشخصي',
    editProfile: 'تحرير الملف الشخصي',
    addFriend: 'إضافة صديق',
    removeFriend: 'إزالة صديق',
    blockUser: 'حجب المستخدم',
    reportUser: 'إبلاغ عن المستخدم',
    ignoreUser: 'تجاهل المستخدم',

    // Profile Fields
    username: 'اسم المستخدم',
    email: 'البريد الإلكتروني',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    age: 'العمر',
    gender: 'الجنس',
    country: 'البلد',
    city: 'المدينة',
    bio: 'نبذة عني',
    status: 'الحالة',

    // Authentication
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    register: 'تسجيل جديد',
    guest: 'ضيف',
    member: 'عضو',

    // Common Actions
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تحرير',
    close: 'إغلاق',
    confirm: 'تأكيد',

    // Status Messages
    welcome: 'مرحباً بك',
    connected: 'متصل',
    disconnected: 'منقطع',
    messageReceived: 'تم استلام رسالة',
    friendRequestSent: 'تم إرسال طلب الصداقة',
    friendRequestReceived: 'تم استلام طلب صداقة',

    // User Types
    owner: 'المالك',
    admin: 'إدمن',
    moderator: 'مشرف',

    // Time and Dates
    joinedAt: 'انضم في',
    lastSeen: 'آخر ظهور',
    now: 'الآن',
    today: 'اليوم',
    yesterday: 'أمس',
  },

  en: {
    // Header and Navigation
    appTitle: 'Arabya Chat',
    settings: 'Settings',
    notifications: 'Notifications',
    friends: 'Friends',
    messages: 'Messages',
    moderation: 'Moderation',
    reports: 'Reports Log',
    actions: 'Actions Log',
    promote: 'Promote Users',
    ownerPanel: 'Owner Panel',

    // Chat Interface
    publicChat: 'Public Chat',
    privateMessage: 'Private Message',
    sendMessage: 'Send Message',
    typing: 'typing...',
    online: 'Online',
    offline: 'Offline',

    // User Actions
    profile: 'Profile',
    viewProfile: 'View Profile',
    editProfile: 'Edit Profile',
    addFriend: 'Add Friend',
    removeFriend: 'Remove Friend',
    blockUser: 'Block User',
    reportUser: 'Report User',
    ignoreUser: 'Ignore User',

    // Profile Fields
    username: 'Username',
    email: 'Email',
    firstName: 'First Name',
    lastName: 'Last Name',
    age: 'Age',
    gender: 'Gender',
    country: 'Country',
    city: 'City',
    bio: 'Bio',
    status: 'Status',

    // Authentication
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    guest: 'Guest',
    member: 'Member',

    // Common Actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',

    // Status Messages
    welcome: 'Welcome',
    connected: 'Connected',
    disconnected: 'Disconnected',
    messageReceived: 'Message received',
    friendRequestSent: 'Friend request sent',
    friendRequestReceived: 'Friend request received',

    // User Types
    owner: 'Owner',
    admin: 'Admin',
    moderator: 'Moderator',

    // Time and Dates
    joinedAt: 'Joined',
    lastSeen: 'Last seen',
    now: 'Now',
    today: 'Today',
    yesterday: 'Yesterday',
  },

  fr: {
    // Header and Navigation
    appTitle: 'Chat Arabe',
    settings: 'Paramètres',
    notifications: 'Notifications',
    friends: 'Amis',
    messages: 'Messages',
    moderation: 'Modération',
    reports: 'Journal des Rapports',
    actions: 'Journal des Actions',
    promote: 'Promouvoir les Utilisateurs',
    ownerPanel: 'Panneau Propriétaire',

    // Chat Interface
    publicChat: 'Chat Public',
    privateMessage: 'Message Privé',
    sendMessage: 'Envoyer un Message',
    typing: "en train d'écrire...",
    online: 'En ligne',
    offline: 'Hors ligne',

    // User Actions
    profile: 'Profil',
    viewProfile: 'Voir le Profil',
    editProfile: 'Modifier le Profil',
    addFriend: 'Ajouter un Ami',
    removeFriend: 'Supprimer un Ami',
    blockUser: "Bloquer l'Utilisateur",
    reportUser: "Signaler l'Utilisateur",
    ignoreUser: "Ignorer l'Utilisateur",

    // Profile Fields
    username: "Nom d'utilisateur",
    email: 'Email',
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    age: 'Âge',
    gender: 'Genre',
    country: 'Pays',
    city: 'Ville',
    bio: 'Bio',
    status: 'Statut',

    // Authentication
    login: 'Connexion',
    logout: 'Déconnexion',
    register: "S'inscrire",
    guest: 'Invité',
    member: 'Membre',

    // Common Actions
    save: 'Sauvegarder',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    confirm: 'Confirmer',

    // Status Messages
    welcome: 'Bienvenue',
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    messageReceived: 'Message reçu',
    friendRequestSent: "Demande d'ami envoyée",
    friendRequestReceived: "Demande d'ami reçue",

    // User Types
    owner: 'Propriétaire',
    admin: 'Admin',
    moderator: 'Modérateur',

    // Time and Dates
    joinedAt: 'Rejoint',
    lastSeen: 'Vu pour la dernière fois',
    now: 'Maintenant',
    today: "Aujourd'hui",
    yesterday: 'Hier',
  },

  es: {
    // Header and Navigation
    appTitle: 'Chat Árabe',
    settings: 'Configuración',
    notifications: 'Notificaciones',
    friends: 'Amigos',
    messages: 'Mensajes',
    moderation: 'Moderación',
    reports: 'Registro de Reportes',
    actions: 'Registro de Acciones',
    promote: 'Promover Usuarios',
    ownerPanel: 'Panel del Propietario',

    // Chat Interface
    publicChat: 'Chat Público',
    privateMessage: 'Mensaje Privado',
    sendMessage: 'Enviar Mensaje',
    typing: 'escribiendo...',
    online: 'En línea',
    offline: 'Desconectado',

    // User Actions
    profile: 'Perfil',
    viewProfile: 'Ver Perfil',
    editProfile: 'Editar Perfil',
    addFriend: 'Agregar Amigo',
    removeFriend: 'Eliminar Amigo',
    blockUser: 'Bloquear Usuario',
    reportUser: 'Reportar Usuario',
    ignoreUser: 'Ignorar Usuario',

    // Profile Fields
    username: 'Nombre de usuario',
    email: 'Correo electrónico',
    firstName: 'Nombre',
    lastName: 'Apellido',
    age: 'Edad',
    gender: 'Género',
    country: 'País',
    city: 'Ciudad',
    bio: 'Biografía',
    status: 'Estado',

    // Authentication
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
    register: 'Registrarse',
    guest: 'Invitado',
    member: 'Miembro',

    // Common Actions
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    confirm: 'Confirmar',

    // Status Messages
    welcome: 'Bienvenido',
    connected: 'Conectado',
    disconnected: 'Desconectado',
    messageReceived: 'Mensaje recibido',
    friendRequestSent: 'Solicitud de amistad enviada',
    friendRequestReceived: 'Solicitud de amistad recibida',

    // User Types
    owner: 'Propietario',
    admin: 'Admin',
    moderator: 'Moderador',

    // Time and Dates
    joinedAt: 'Se unió',
    lastSeen: 'Visto por última vez',
    now: 'Ahora',
    today: 'Hoy',
    yesterday: 'Ayer',
  },

  // Add more languages as needed...
};

export function getTranslation(language: string): Translation {
  return translations[language] || translations['ar']; // Default to Arabic
}

export function useTranslation(language: string) {
  return getTranslation(language);
}
