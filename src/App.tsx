import React, { useState, useEffect } from 'react';
import { Shield, Heart, HeartCrack, Coins, Trophy, ShoppingCart, Zap, AlertTriangle, ShieldAlert, CheckCircle, XCircle, ArrowRight, Clock, User, LogOut, Eye, EyeOff, Loader2 } from 'lucide-react';


// --- MOCK DATA & CONFIG ---
const INITIAL_STATE = {
    currentLevel: 1,
    totalXP: 0,
    spendableXP: 150, // Modal awal
    weeklyXP: 0,
    hearts: 3,
    maxHearts: 3,
    securityLevel: 100,
    inventory: {}, // Format: { itemId: quantity }
    cooldownUntil: null, // Timestamp
};

const ITEMS = [
    { id: 'antivirus', name: 'Antivirus Patch', type: 'consumable', effect: 'Restore 1 Heart', price: 50, icon: <Heart className="text-red-400" /> },
    { id: 'firewall', name: 'Firewall Config', type: 'passive', effect: 'Kurangi damage Security -50%', price: 100, icon: <Shield className="text-blue-400" /> },
    { id: 'overclock', name: 'Overclock Script', type: 'risky', effect: 'XP x2, tapi salah = -2 Hearts', price: 150, icon: <Zap className="text-yellow-400" /> }
];

const MOCK_AI_SCENARIOS = [
    {
        threat: 'Phishing',
        context: 'CEO meminta transfer dana mendesak ke vendor baru via email dengan domain @company-update.com.',
        options: [
            { text: 'Segera proses agar tidak dimarahi CEO', isCorrect: false },
            { text: 'Verifikasi via telepon ke nomor resmi CEO', isCorrect: true },
            { text: 'Balas email meminta rincian lebih lanjut', isCorrect: false }
        ],
        explanation: 'Domain email dipalsukan (spoofing). Verifikasi out-of-band (telepon) wajib untuk permintaan dana mendadak.'
    },
    {
        threat: 'Malware',
        context: 'Seorang karyawan mencolokkan flashdisk yang ditemukan di parkiran ke laptop kantor.',
        options: [
            { text: 'Format flashdisk segera', isCorrect: false },
            { text: 'Isolasi laptop dari jaringan dan lapor Tim Security', isCorrect: true },
            { text: 'Buka isinya untuk mencari tahu siapa pemiliknya', isCorrect: false }
        ],
        explanation: 'Bisa jadi ini serangan USB Drop. Mengisolasi jaringan mencegah penyebaran lateral jika malware otomatis berjalan.'
    },
    {
        threat: 'Social Engineering',
        context: 'Seseorang menelpon mengaku dari IT Support meminta password untuk "maintenance server darurat".',
        options: [
            { text: 'Tolak dan tutup telepon', isCorrect: true },
            { text: 'Berikan password sementara lalu segera ganti', isCorrect: false },
            { text: 'Minta ID Karyawan dan berikan jika cocok', isCorrect: false }
        ],
        explanation: 'IT Support asli tidak pernah meminta password user. Menolak adalah langkah paling aman.'
    }
];

// --- MAIN APP COMPONENT ---
export default function CyberSecurityApp() {
    const [gameState, setGameState] = useState(INITIAL_STATE);
    const [currentScreen, setCurrentScreen] = useState('auth'); // Ubah dari dashboard ke auth
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [levelProgress, setLevelProgress] = useState({ currentQ: 0, totalQ: 3 });
    const [activeBuffs, setActiveBuffs] = useState({});

    // Tambahan State untuk Auth & Database
    const [loggedInUsername, setLoggedInUsername] = useState('');
    const [authInput, setAuthInput] = useState({ username: '', password: '' });
    const [isRegistering, setIsRegistering] = useState(false);

    // State Baru untuk Auth UI & AI
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [leaderboard, setLeaderboard] = useState<any[]>([]); // State untuk nampung data pemain lain

    // 2. Save State ke LocalStorage (Mocking Firestore)
    useEffect(() => {
        if (loggedInUsername && currentScreen !== 'auth') {
            const dataStr = localStorage.getItem(`player_${loggedInUsername}`);
            if (dataStr) {
                const data = JSON.parse(dataStr);
                localStorage.setItem(`player_${loggedInUsername}`, JSON.stringify({ ...data, state: gameState }));
            }
        }
    }, [gameState, loggedInUsername, currentScreen]);

    // 3. Tarik data Leaderboard (Mocking from LocalStorage)
    useEffect(() => {
        if (currentScreen !== 'dashboard') return;

        const playersList: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('player_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    if (data && data.state) {
                        playersList.push({ username: key.replace('player_', ''), xp: data.state.weeklyXP || 0 });
                    }
                } catch(e) { }
            }
        }
        
        // Sortir dari XP terbesar ke terkecil
        playersList.sort((a, b) => b.xp - a.xp);
        setLeaderboard(playersList.slice(0, 5)); // Ambil Top 5 aja
    }, [currentScreen, gameState.weeklyXP]); // Update also when own xp changes

    // Cooldown timer check
    const [timeLeft, setTimeLeft] = useState(0);
    useEffect(() => {
        if (gameState.cooldownUntil) {
            const interval = setInterval(() => {
                const now = new Date().getTime();
                const distance = gameState.cooldownUntil - now;
                if (distance <= 0) {
                    setGameState(prev => ({ ...prev, hearts: prev.maxHearts, cooldownUntil: null }));
                    clearInterval(interval);
                } else {
                    setTimeLeft(Math.floor(distance / 1000));
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameState.cooldownUntil]);

    // --- CORE ACTIONS ---
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');

        if (!authInput.username || !authInput.password) return setAuthError("Username dan password wajib diisi!");
        if (authInput.password.length < 6) return setAuthError("Password minimal 6 karakter!");

        setAuthLoading(true);
        const playerKey = `player_${authInput.username}`;

        setTimeout(() => {
            if (isRegistering) {
                if (localStorage.getItem(playerKey)) {
                    setAuthError("Username sudah dipakai, coba yang lain!");
                    setAuthLoading(false);
                    return;
                }
                localStorage.setItem(playerKey, JSON.stringify({ password: authInput.password, state: INITIAL_STATE }));
                setGameState(INITIAL_STATE);
                setLoggedInUsername(authInput.username);
                setCurrentScreen('dashboard');
            } else {
                const dataStr = localStorage.getItem(playerKey);
                if (!dataStr) {
                    setAuthError("Username tidak ditemukan!");
                    setAuthLoading(false);
                    return;
                }
                const data = JSON.parse(dataStr);
                if (data.password !== authInput.password) {
                    setAuthError("Password salah!");
                    setAuthLoading(false);
                    return;
                }
                setGameState(data.state || INITIAL_STATE);
                setLoggedInUsername(authInput.username);
                setCurrentScreen('dashboard');
            }
            setAuthLoading(false);
        }, 500); // Simulate network delay
    };

    const handleLogout = () => {
        setLoggedInUsername('');
        setGameState(INITIAL_STATE);
        setAuthInput({ username: '', password: '' });
        setCurrentScreen('auth');
    };

    const buyItem = (item) => {
        if (gameState.spendableXP >= item.price) {
            setGameState(prev => ({
                ...prev,
                spendableXP: prev.spendableXP - item.price,
                inventory: {
                    ...prev.inventory,
                    [item.id]: (prev.inventory[item.id] || 0) + 1
                }
            }));
            alert(`Berhasil membeli ${item.name}!`);
        } else {
            alert("Spendable XP tidak cukup!");
        }
    };

    const useItem = (item) => {
        if (!gameState.inventory[item.id]) return;

        // Remove 1 from inventory
        const newInv = { ...gameState.inventory, [item.id]: gameState.inventory[item.id] - 1 };

        if (item.id === 'antivirus') {
            if (gameState.hearts >= gameState.maxHearts) return alert("Nyawa sudah penuh!");
            setGameState(prev => ({ ...prev, hearts: Math.min(prev.maxHearts, prev.hearts + 1), inventory: newInv }));
        } else if (item.id === 'firewall' || item.id === 'overclock') {
            setActiveBuffs(prev => ({ ...prev, [item.id]: true }));
            setGameState(prev => ({ ...prev, inventory: newInv }));
        }
        alert(`${item.name} diaktifkan!`);
    };

    const startLevel = () => {
        if (gameState.hearts <= 0) {
            alert("Sistem down! Tunggu cooldown selesai.");
            return;
        }
        setCurrentScreen('prep');
        setActiveBuffs({}); // Reset buffs
    };

    // Integrasi Gemini API
    const callGeminiAPI = async (level: number) => {
        const apiKey = "";
        if (!apiKey) throw new Error("No API key"); // Force fallback to MOCK
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const prompt = `Buatkan satu skenario ancaman keamanan siber berbahasa Indonesia untuk simulasi dengan tingkat kesulitan level ${level} (1=mudah, 10=susah). Berikan konteks masalah, 3 pilihan tindakan (hanya 1 yang benar), dan penjelasan ringkas.`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        threat: { type: "STRING" },
                        context: { type: "STRING" },
                        options: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    text: { type: "STRING" },
                                    isCorrect: { type: "BOOLEAN" }
                                }
                            }
                        },
                        explanation: { type: "STRING" }
                    },
                    required: ["threat", "context", "options", "explanation"]
                }
            }
        };

        const delays = [1000, 2000, 4000, 8000, 16000];
        for (let attempt = 0; attempt < 6; attempt++) {
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return JSON.parse(data.candidates[0].content.parts[0].text);
                }
                throw new Error("Invalid response format");
            } catch (err) {
                if (attempt === 5) throw err;
                await new Promise(res => setTimeout(res, delays[attempt]));
            }
        }
    };

    const beginChallenge = async () => {
        setLevelProgress({ currentQ: 0, totalQ: 2 + gameState.currentLevel });
        setCurrentScreen('challenge');
        setGameState(prev => ({ ...prev, securityLevel: 100 }));
        await generateNextQuestion();
    };

    const generateNextQuestion = async () => {
        setIsGenerating(true);
        setActiveQuestion(null);
        setFeedback(null);

        try {
            const aiQuestion = await callGeminiAPI(gameState.currentLevel);
            // Acak urutan opsi jawaban
            const shuffledOptions = [...aiQuestion.options].sort(() => Math.random() - 0.5);
            setActiveQuestion({ ...aiQuestion, options: shuffledOptions });
        } catch (error) {
            console.error("Gagal generate soal AI, pakai fallback mock", error);
            const randomQ = MOCK_AI_SCENARIOS[Math.floor(Math.random() * MOCK_AI_SCENARIOS.length)];
            const shuffledOptions = [...randomQ.options].sort(() => Math.random() - 0.5);
            setActiveQuestion({ ...randomQ, options: shuffledOptions });
        }

        setIsGenerating(false);
    };

    const handleAnswer = (isCorrect) => {
        const isOverclocked = activeBuffs['overclock'];
        const hasFirewall = activeBuffs['firewall'];

        let xpGain = 0;
        let heartDamage = 0;
        let secDamage = 0;

        if (isCorrect) {
            xpGain = 50 + (gameState.currentLevel * 10);
            if (isOverclocked) xpGain *= 2;

            setFeedback({ type: 'success', text: `Berhasil diatasi! ${activeQuestion.explanation}`, xpGain });
        } else {
            heartDamage = isOverclocked ? 2 : 1;
            secDamage = hasFirewall ? 15 : 30;

            setFeedback({ type: 'error', text: `Sistem Terkena Dampak! ${activeQuestion.explanation}`, heartDamage, secDamage });
        }

        // Update State
        const nextHearts = Math.max(0, gameState.hearts - heartDamage);
        const nextSecLevel = Math.max(0, gameState.securityLevel - secDamage);

        setGameState(prev => {
            const newState = {
                ...prev,
                hearts: nextHearts,
                securityLevel: nextSecLevel,
                totalXP: prev.totalXP + xpGain,
                spendableXP: prev.spendableXP + xpGain,
                weeklyXP: prev.weeklyXP + xpGain
            };

            // Trigger Cooldown jika mati
            if (nextHearts === 0 && !prev.cooldownUntil) {
                newState.cooldownUntil = new Date().getTime() + (60000); // 1 Menit simulasi cooldown
            }
            return newState;
        });
    };

    const nextAction = async () => {
        if (gameState.hearts <= 0) {
            setCurrentScreen('dashboard'); // Kembali ke menu (akan lihat timer)
            return;
        }

        const nextQ = levelProgress.currentQ + 1;
        if (nextQ >= levelProgress.totalQ) {
            // Level Selesai
            setGameState(prev => ({ ...prev, currentLevel: prev.currentLevel + 1 }));
            setCurrentScreen('result');
        } else {
            setLevelProgress(prev => ({ ...prev, currentQ: nextQ }));
            await generateNextQuestion();
        }
    };

    // --- UI COMPONENTS ---
    const TopBar = () => (
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-wrap justify-between items-center sticky top-0 z-10">
            <div className="flex items-center space-x-2">
                <ShieldAlert className="text-emerald-400" />
                <h1 className="font-bold text-white text-xl hidden sm:block">CyberSec Defender</h1>
            </div>
            {currentScreen !== 'auth' && (
                <div className="flex space-x-4 text-sm font-semibold items-center">
                    <div className="flex items-center text-slate-300 mr-2 border-r border-slate-600 pr-4">
                        <User className="w-4 h-4 mr-1" /> {loggedInUsername}
                    </div>
                    <div className="flex items-center text-red-400">
                        <Heart className="w-5 h-5 mr-1" fill={gameState.hearts > 0 ? "currentColor" : "none"} />
                        {gameState.hearts}/{gameState.maxHearts}
                    </div>
                    <div className="flex items-center text-blue-400">
                        <Shield className="w-5 h-5 mr-1" /> {gameState.securityLevel}%
                    </div>
                    <div className="flex items-center text-yellow-400">
                        <Coins className="w-5 h-5 mr-1" /> {gameState.spendableXP}
                    </div>
                    <button onClick={handleLogout} className="ml-2 text-slate-400 hover:text-red-400 flex items-center transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );

    // --- SCREENS ---
    const AuthScreen = () => (
        <div className="p-6 max-w-md mx-auto mt-20 animate-fade-in">
            <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl">
                <div className="text-center mb-8">
                    <ShieldAlert className="text-emerald-400 w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">CyberSec Network</h2>
                    <p className="text-slate-400">{isRegistering ? 'Buat kredensial baru' : 'Otentikasi ke sistem Cloud (Mock)'}</p>
                </div>

                {authError && (
                    <div className="bg-red-900/40 border border-red-500 text-red-200 text-sm p-3 rounded-lg mb-4 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                        {authError}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-slate-400 text-sm mb-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Masukkan username apapun"
                                value={authInput.username}
                                onChange={e => setAuthInput({ ...authInput, username: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pl-10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                disabled={authLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={isRegistering ? "Minimal 6 karakter" : "Masukkan sembarang 6 huruf"}
                                value={authInput.password}
                                onChange={e => setAuthInput({ ...authInput, password: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pl-4 pr-10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                disabled={authLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-all shadow-lg flex justify-center items-center mt-2"
                    >
                        {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? 'Register Akses' : 'Login Secure')}
                    </button>
                </form>

                <p className="mt-6 text-sm text-center text-slate-400 border-t border-slate-700 pt-6">
                    {isRegistering ? 'Sudah punya akses? ' : 'Belum terdaftar? '}
                    <button
                        onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                        className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold transition-colors"
                        disabled={authLoading}
                    >
                        {isRegistering ? 'Login di sini' : 'Register di sini'}
                    </button>
                </p>
            </div>
        </div>
    );

    const DashboardScreen = () => (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Profile Card */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-4">Profil Analyst</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Level Saat Ini</span>
                            <span className="text-white font-bold">Level {gameState.currentLevel}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Total XP (Permanen)</span>
                            <span className="text-purple-400 font-bold">{gameState.totalXP} XP</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Spendable XP</span>
                            <span className="text-yellow-400 font-bold">{gameState.spendableXP} XP</span>
                        </div>
                    </div>

                    {gameState.hearts <= 0 ? (
                        <div className="mt-6 bg-red-900/30 p-4 rounded-lg border border-red-500/50 flex flex-col items-center">
                            <Clock className="w-8 h-8 text-red-400 mb-2 animate-pulse" />
                            <p className="text-red-200 font-semibold mb-1">Sistem Down - Cooldown Aktif</p>
                            <p className="text-white text-2xl font-mono">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
                        </div>
                    ) : (
                        <button onClick={startLevel} className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            Mulai Level {gameState.currentLevel}
                        </button>
                    )}
                </div>

                {/* Quick Actions & Leaderboard */}
                <div className="space-y-6">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg cursor-pointer hover:bg-slate-750 transition" onClick={() => setCurrentScreen('market')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center"><ShoppingCart className="mr-2" /> Black Market</h3>
                                <p className="text-slate-400 text-sm mt-1">Beli aset keamanan dengan Spendable XP</p>
                            </div>
                            <ArrowRight className="text-slate-500" />
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h3 className="text-xl font-bold text-white flex items-center mb-4"><Trophy className="mr-2 text-yellow-400" /> Leaderboard Mingguan</h3>
                        <ul className="space-y-3">
                            {leaderboard.length === 0 ? (
                                <li className="text-slate-400 text-sm text-center">Memuat data pemain...</li>
                            ) : (
                                leaderboard.map((player, index) => (
                                    <li key={player.username} className={`flex justify-between text-sm p-2 rounded ${player.username === loggedInUsername ? 'bg-slate-700/50 border border-purple-500/50' : 'bg-slate-700'}`}>
                                        <span className={player.username === loggedInUsername ? 'text-purple-300 font-bold' : 'text-white'}>
                                            {index + 1}. {player.username} {player.username === loggedInUsername && '(Kamu)'}
                                        </span>
                                        <span className="text-yellow-400 font-bold">{player.xp} XP</span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    const MarketScreen = () => (
        <div className="p-6 max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white flex items-center"><ShoppingCart className="mr-3" /> Security Market</h2>
                <button onClick={() => setCurrentScreen('dashboard')} className="text-slate-400 hover:text-white">Kembali</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {ITEMS.map(item => (
                    <div key={item.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between">
                        <div>
                            <div className="mb-4 bg-slate-900 w-12 h-12 rounded-lg flex items-center justify-center">
                                {item.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{item.name}</h3>
                            <p className="text-xs text-purple-400 mb-2 uppercase font-bold tracking-wider">{item.type}</p>
                            <p className="text-sm text-slate-300 mb-6">{item.effect}</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3 text-sm">
                                <span className="text-slate-400">Dimiliki: {gameState.inventory[item.id] || 0}</span>
                                <span className="text-yellow-400 font-bold flex items-center"><Coins className="w-4 h-4 mr-1" /> {item.price}</span>
                            </div>
                            <button
                                onClick={() => buyItem(item)}
                                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors disabled:opacity-50"
                            >
                                Beli Item
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const PrepScreen = () => (
        <div className="p-6 max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-white">Persiapan Infrastruktur</h2>

            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-left">
                <h3 className="text-red-400 font-bold mb-2 flex items-center"><AlertTriangle className="mr-2" /> Threat Intelligence Intel</h3>
                <p className="text-slate-300">Sistem AI memprediksi adanya anomali jaringan. Probabilitas serangan Social Engineering tinggi di sektor ini.</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-left">
                <h3 className="text-white font-bold mb-4">Inventory Anda (Pilih untuk Deploy)</h3>
                <div className="flex flex-wrap gap-4">
                    {ITEMS.map(item => {
                        const count = gameState.inventory[item.id] || 0;
                        return (
                            <button
                                key={item.id}
                                disabled={count === 0 || activeBuffs[item.id]}
                                onClick={() => useItem(item)}
                                className={`p-3 rounded border flex items-center space-x-2 transition-all ${activeBuffs[item.id] ? 'bg-emerald-900/50 border-emerald-500 text-emerald-200' : count > 0 ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
                            >
                                {item.icon}
                                <span className="text-sm font-semibold">{item.name} ({count})</span>
                                {activeBuffs[item.id] && <CheckCircle className="w-4 h-4 ml-2" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <button onClick={beginChallenge} className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                Mulai Simulasi
            </button>
        </div>
    );

    const ChallengeScreen = () => {
        if (isGenerating) {
            return (
                <div className="p-6 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[50vh] animate-fade-in text-center">
                    <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">AI Menganalisis Jaringan...</h2>
                    <p className="text-slate-400 text-lg">Membangun skenario ancaman dinamis berdasarkan level kamu.</p>
                </div>
            );
        }

        if (!activeQuestion) return null;

        return (
            <div className="p-6 max-w-3xl mx-auto animate-fade-in">
                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                        <span>Skenario {levelProgress.currentQ + 1} dari {levelProgress.totalQ}</span>
                        <span>Security Integrity: {gameState.securityLevel}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full transition-all duration-500 ${gameState.securityLevel > 50 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${gameState.securityLevel}%` }}></div>
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-8 rounded-xl shadow-2xl relative overflow-hidden">
                    {/* Active Buff Indicators */}
                    <div className="absolute top-0 right-0 p-4 flex space-x-2">
                        {activeBuffs['firewall'] && <Shield className="w-5 h-5 text-blue-400 opacity-70" />}
                        {activeBuffs['overclock'] && <Zap className="w-5 h-5 text-yellow-400 opacity-70" />}
                    </div>

                    <h3 className="text-xs uppercase tracking-widest text-red-400 font-bold mb-2">Deteksi Ancaman: {activeQuestion.threat}</h3>
                    <p className="text-xl text-white mb-8">{activeQuestion.context}</p>

                    {!feedback ? (
                        <div className="space-y-4">
                            {activeQuestion.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(opt.isCorrect)}
                                    className="w-full text-left p-4 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 hover:border-slate-500 text-slate-200 transition-all"
                                >
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className={`p-6 rounded-lg animate-fade-in ${feedback.type === 'success' ? 'bg-emerald-900/30 border border-emerald-500/50' : 'bg-red-900/30 border border-red-500/50'}`}>
                            <div className="flex items-start">
                                {feedback.type === 'success' ? <CheckCircle className="text-emerald-400 w-8 h-8 mr-3 flex-shrink-0" /> : <XCircle className="text-red-400 w-8 h-8 mr-3 flex-shrink-0" />}
                                <div>
                                    <h4 className={`text-lg font-bold mb-2 ${feedback.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {feedback.type === 'success' ? 'Keputusan Tepat!' : 'Kritis! Terjadi Pelanggaran Keamanan'}
                                    </h4>
                                    <p className="text-slate-300 mb-4">{feedback.text}</p>

                                    <div className="flex space-x-4 text-sm font-mono">
                                        {feedback.xpGain && <span className="text-yellow-400">+{feedback.xpGain} XP</span>}
                                        {feedback.heartDamage && <span className="text-red-400">-{feedback.heartDamage} Hearts</span>}
                                        {feedback.secDamage && <span className="text-blue-400">-{feedback.secDamage}% Security</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={nextAction} className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold border border-slate-600">
                                Lanjutkan
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const ResultScreen = () => (
        <div className="p-6 max-w-2xl mx-auto text-center space-y-6 animate-fade-in mt-10">
            <Trophy className="w-24 h-24 text-yellow-400 mx-auto" />
            <h2 className="text-4xl font-bold text-white">Level Diselesaikan!</h2>
            <p className="text-slate-300">Infrastruktur perusahaan berhasil diamankan berkat keputusan strategismu.</p>

            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl inline-block mt-4">
                <p className="text-sm text-slate-400 mb-2">Status Akhir</p>
                <div className="flex justify-center space-x-8 text-xl font-bold">
                    <span className="text-red-400 flex items-center"><Heart className="mr-2" /> {gameState.hearts}</span>
                    <span className="text-blue-400 flex items-center"><Shield className="mr-2" /> {gameState.securityLevel}%</span>
                </div>
            </div>

            <div className="pt-8">
                <button onClick={() => setCurrentScreen('dashboard')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold">
                    Kembali ke Dashboard
                </button>
            </div>
        </div>
    );

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-slate-900 font-sans text-slate-200">
            {TopBar()}
            <main className="pt-6 pb-12">
                {currentScreen === 'auth' && AuthScreen()}
                {currentScreen === 'dashboard' && DashboardScreen()}
                {currentScreen === 'market' && MarketScreen()}
                {currentScreen === 'prep' && PrepScreen()}
                {currentScreen === 'challenge' && ChallengeScreen()}
                {currentScreen === 'result' && ResultScreen()}
            </main>

            {/* Tailwind basic styles injection for animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}} />
        </div>
    );
}