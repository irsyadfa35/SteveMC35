// ============================================================
// AUTH CHECK - Pengecekan Login Universal untuk SteveMC
// ============================================================

// ============================================================
// 1. SUPABASE KONFIGURASI
// ============================================================
const SUPABASE_URL = 'https://ydcdfnvtacwrrhcbsjdk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DABKAaVwkW5LvR7oP-pDNQ_9SyGiBrI';

// Inisialisasi Supabase Client (hanya sekali)
let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// ============================================================
// 2. OWNER SYSTEM - KONFIGURASI
// ============================================================
const OWNER_ID = 'ce5879ba-007c-4258-acd1-75246073a151';

// ============================================================
// 3. FLAG UNTUK MENCEGAH REDIRECT BERGANDA
// ============================================================
let isRedirecting = false;

// ============================================================
// 4. FUNGSI PENGECEKAN
// ============================================================

/**
 * Cek apakah user adalah owner
 * @param {object} user - Objek user dari Supabase
 * @returns {boolean} - true jika owner, false jika bukan
 */
function isOwner(user) {
    if (!user || !user.id) return false;
    return user.id === OWNER_ID;
}

/**
 * Cek status login user (tanpa redirect)
 * @returns {Promise<{isLoggedIn: boolean, session: object, user: object, isOwner: boolean}>}
 */
async function checkAuth() {
    try {
        const supabase = getSupabaseClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.warn('⚠️ Error get session:', error);
            return {
                isLoggedIn: false,
                session: null,
                user: null,
                isOwner: false
            };
        }

        if (!session) {
            return {
                isLoggedIn: false,
                session: null,
                user: null,
                isOwner: false
            };
        }

        const user = session.user;
        const isOwnerUser = isOwner(user);

        console.log('🆔 User ID:', user.id);
        console.log('👑 Status Owner:', isOwnerUser ? 'TRUE ✅' : 'FALSE ❌');
        console.log('📧 Email:', user.email);

        return {
            isLoggedIn: true,
            session: session,
            user: user,
            isOwner: isOwnerUser
        };

    } catch (error) {
        console.error('❌ Error checking auth:', error);
        return {
            isLoggedIn: false,
            session: null,
            user: null,
            isOwner: false,
            error: error.message
        };
    }
}

/**
 * Cek login dan redirect jika belum login (hanya untuk halaman yang membutuhkan login)
 * @param {string} redirectUrl - URL tujuan jika belum login (default: 'https://stevemc.my.id/login.html')
 * @param {boolean} redirectIfLoggedOut - Jika true, redirect ke login jika belum login
 * @returns {Promise<{isLoggedIn: boolean, session: object, user: object, isOwner: boolean}>}
 */
async function requireAuth(redirectUrl = 'https://stevemc.my.id/login.html', redirectIfLoggedOut = true) {
    const result = await checkAuth();

    if (!result.isLoggedIn && redirectIfLoggedOut && !isRedirecting) {
        console.log('🔒 User belum login, redirect ke login...');
        isRedirecting = true;
        window.location.replace(redirectUrl);
        return { isLoggedIn: false, session: null, user: null, isOwner: false, redirecting: true };
    }

    return result;
}

/**
 * Cek login tanpa redirect (hanya return status)
 * @returns {Promise<{isLoggedIn: boolean, session: object, user: object, isOwner: boolean}>}
 */
async function getAuthStatus() {
    return await checkAuth();
}

/**
 * Logout user
 * @param {string} redirectUrl - URL tujuan setelah logout (default: 'https://stevemc.my.id/login.html')
 */
async function logoutUser(redirectUrl = 'https://stevemc.my.id/login.html') {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('❌ Logout error:', error);
            return { success: false, error: error.message };
        }
        console.log('👋 User logged out successfully');
        window.location.replace(redirectUrl);
        return { success: true };
    } catch (error) {
        console.error('❌ Logout error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Subscribe ke perubahan auth state
 * @param {Function} callback - Fungsi yang dipanggil saat auth state berubah
 * @returns {object} - Subscription object (untuk unsubscribe)
 */
function onAuthChange(callback) {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth event:', event);
        callback(event, session);
    });
    return subscription;
}

/**
 * Tampilkan loading screen (untuk halaman yang perlu auth check)
 * @param {string} message - Pesan loading
 */
function showAuthLoading(message = 'Memeriksa session...') {
    let loadingEl = document.getElementById('authLoading');
    
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'authLoading';
        loadingEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #080c1a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.5s ease;
        `;
        loadingEl.innerHTML = `
            <div style="width:50px;height:50px;border:3px solid rgba(124,77,255,0.1);border-top:3px solid #7c4dff;border-radius:50%;animation:spin 1s linear infinite;"></div>
            <p style="margin-top:16px;color:rgba(255,255,255,0.4);font-size:0.95rem;font-family:'Inter',sans-serif;">${message}</p>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(loadingEl);
    } else {
        const p = loadingEl.querySelector('p');
        if (p) p.textContent = message;
        loadingEl.style.display = 'flex';
        loadingEl.style.opacity = '1';
    }
}

/**
 * Sembunyikan loading screen
 */
function hideAuthLoading() {
    const loadingEl = document.getElementById('authLoading');
    if (loadingEl) {
        loadingEl.style.opacity = '0';
        setTimeout(() => {
            loadingEl.style.display = 'none';
        }, 500);
    }
}

/**
 * Tampilkan konten utama (sembunyikan loading)
 * @param {string} mainContentId - ID elemen konten utama
 * @param {string} footerId - ID elemen footer (opsional)
 */
function showMainContent(mainContentId = 'mainContent', footerId = 'mainFooter') {
    const mainContent = document.getElementById(mainContentId);
    const mainFooter = document.getElementById(footerId);
    
    if (mainContent) mainContent.style.display = 'block';
    if (mainFooter) mainFooter.style.display = 'block';
    
    hideAuthLoading();
}

/**
 * Reset flag redirect (digunakan setelah redirect)
 */
function resetRedirectFlag() {
    isRedirecting = false;
}

// ============================================================
// 5. FUNGSI UNTUK MENU (menampilkan user profile di sidebar)
// ============================================================

/**
 * Update menu dengan user profile
 * @param {object} session - Session dari Supabase
 * @param {string} menuContainerId - ID container menu
 */
function updateMenuWithUser(session, menuContainerId = 'menuContainer') {
    const menuContainer = document.getElementById(menuContainerId);
    if (!menuContainer) return;

    setTimeout(() => {
        const menuPanel = document.getElementById('menuPanel');
        if (!menuPanel) return;

        const user = session.user;
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User';
        const email = user.email || '';
        const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        const initial = name.charAt(0).toUpperCase();

        const menuList = menuPanel.querySelector('.menu-list');
        if (!menuList) return;

        const existingProfile = menuPanel.querySelector('.user-profile');
        if (existingProfile) existingProfile.remove();
        const existingLogout = menuPanel.querySelector('.btn-logout-sidebar');
        if (existingLogout) existingLogout.remove();

        const profileDiv = document.createElement('div');
        profileDiv.className = 'user-profile';
        profileDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
            margin-bottom: 8px;
        `;

        profileDiv.innerHTML = `
            ${avatar 
                ? `<img class="avatar" src="${avatar}" alt="Avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #7c4dff;flex-shrink:0;" />` 
                : `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#7c4dff,#00e5ff);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.2rem;color:#fff;flex-shrink:0;">${initial}</div>`
            }
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.9rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
                <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${email}</div>
            </div>
        `;

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn-logout-sidebar';
        logoutBtn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 10px;
            color: #ff6b6b;
            background: rgba(255, 0, 0, 0.06);
            border: 1px solid rgba(255, 0, 0, 0.08);
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.3s ease;
            font-family: inherit;
            width: 100%;
            text-align: left;
            margin-bottom: 8px;
        `;
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.addEventListener('click', async () => {
            await logoutUser();
            window.location.reload();
        });

        menuList.parentNode.insertBefore(profileDiv, menuList.nextSibling);
        menuList.parentNode.insertBefore(logoutBtn, profileDiv.nextSibling);

        // Sembunyikan tombol login
        const loginMenuItem = document.getElementById('loginMenuItem');
        if (loginMenuItem) loginMenuItem.style.display = 'none';

    }, 100);
}

// ============================================================
// 6. FUNGSI UNTUK MENAMPILKAN OWNER BADGE
// ============================================================

function showOwnerBadge(elementId, isOwner) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (isOwner) {
        element.style.display = 'inline-flex';
        element.innerHTML = '<i class="fas fa-crown"></i> Owner';
        element.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #ffd700, #f59e0b);
            color: #1a1a2e;
            padding: 4px 14px;
            border-radius: 60px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-left: 8px;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        `;
    } else {
        element.style.display = 'none';
    }
}

// ============================================================
// 7. EKSPOSE KE WINDOW
// ============================================================
window.steveMC = {
    ...(window.steveMC || {}),
    auth: {
        checkAuth,
        requireAuth,
        getAuthStatus,
        logoutUser,
        onAuthChange,
        showAuthLoading,
        hideAuthLoading,
        showMainContent,
        updateMenuWithUser,
        showOwnerBadge,
        resetRedirectFlag,
        isOwner,
        OWNER_ID,
        SUPABASE_URL,
        getSupabaseClient
    }
};

// ============================================================
// 8. AUTO-INIT UNTUK HALAMAN YANG MEMBUTUHKAN AUTH
// ============================================================

/**
 * Initialize auth protection untuk halaman
 * @param {object} options - Opsi konfigurasi
 * @param {string} options.mainContentId - ID elemen konten utama
 * @param {string} options.footerId - ID elemen footer
 * @param {string} options.ownerBadgeId - ID elemen badge owner
 * @param {string} options.menuContainerId - ID container menu
 * @param {string} options.redirectUrl - URL redirect jika belum login
 * @param {boolean} options.showLoading - Tampilkan loading screen
 * @param {boolean} options.autoRedirect - Jika true, redirect ke login jika belum login (default: false)
 */
async function initAuthPage(options = {}) {
    const {
        mainContentId = 'mainContent',
        footerId = 'mainFooter',
        ownerBadgeId = 'ownerBadge',
        menuContainerId = 'menuContainer',
        redirectUrl = 'https://stevemc.my.id/login.html',
        showLoading = true,
        autoRedirect = false // ===== PERUBAHAN: default false =====
    } = options;

    if (showLoading) {
        showAuthLoading('Memeriksa session...');
    }

    // ===== PERUBAHAN: Gunakan checkAuth() langsung, bukan requireAuth() =====
    const result = await checkAuth();

    if (!result.isLoggedIn && autoRedirect && !isRedirecting) {
        console.log('🔒 User belum login, redirect ke login...');
        isRedirecting = true;
        window.location.replace(redirectUrl);
        return { isLoggedIn: false, session: null, user: null, isOwner: false, redirecting: true };
    }

    if (!result.isLoggedIn) {
        hideAuthLoading();
        // ===== TAMPILKAN KONTEN TETAP (tanpa redirect) =====
        showMainContent(mainContentId, footerId);
        return result;
    }

    showMainContent(mainContentId, footerId);

    if (ownerBadgeId) {
        showOwnerBadge(ownerBadgeId, result.isOwner);
    }

    if (menuContainerId) {
        updateMenuWithUser(result.session, menuContainerId);
    }

    console.log('✅ Page initialized with auth (no auto-redirect)');

    return result;
}

window.steveMC.auth.initAuthPage = initAuthPage;

console.log('%c🔐 Auth Check Module Loaded!', 'font-size:14px;font-weight:bold;color:#7c4dff;');
console.log('📌 Mode: Tanpa auto-redirect (user bisa lihat website dulu)');
console.log('📌 Tombol Login muncul di menu jika belum login');