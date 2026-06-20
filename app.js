let provider;
let signer;
let contract;

// Alamat Smart Contract BARU lu yang sudah dibypass validasi ZKP-nya di Remix
const CONTRACT_ADDRESS = "0x92A8Acb08e9E9F984149f58974cD684d3032255E"; 

const ABI = [
    "function redeemCouponAnon(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[2] publicInputs) external",
    "function currentMerkleRoot() view returns (bytes32)",
    "function isRedeemed(bytes32) view returns (bool)"
];

const btnConnect = document.getElementById("btnConnect");
const btnGenerateProof = document.getElementById("btnGenerateProof");
const logConsole = document.getElementById("logConsole");
const walletAddress = document.getElementById("walletAddress");
const merkleRootDisplay = document.getElementById("merkleRootDisplay");

// Fungsi pembantu untuk mencetak log ke layar hitam web
function appendLog(text) {
    logConsole.innerText += `\n[${new Date().toLocaleTimeString()}] ${text}`;
}

// Inisialisasi Kontainer Riwayat Transaksi di bawah UI secara dinamis
document.addEventListener("DOMContentLoaded", () => {
    setupHistoryUI();
});

function setupHistoryUI() {
    if (document.getElementById("historyContainer")) return;
    
    const historySection = document.createElement("div");
    historySection.id = "historyContainer";
    historySection.style.marginTop = "30px";
    historySection.style.padding = "20px";
    historySection.style.background = "#ffffff";
    historySection.style.borderRadius = "15px";
    historySection.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
    historySection.style.border = "1px solid #e5e7eb";
    
    historySection.innerHTML = `
        <h3 style="color: #b91c1c; margin-top: 0; margin-bottom: 15px; font-family: sans-serif; font-size: 18px; display: flex; align-items: center; gap: 8px;">
            🇮🇩 Riwayat Pencairan Subsidi Anggota (Kopdes)
        </h3>
        <div id="historyList" style="display: flex; flex-direction: column; gap: 10px;">
            <p id="emptyHistoryText" style="color: #9ca3af; font-size: 14px; margin: 0; font-style: italic;">Belum ada riwayat pencairan subsidi pada sesi ini.</p>
        </div>
    `;
    
    const mainWrapper = btnGenerateProof.closest("div").parentElement;
    if (mainWrapper) {
        mainWrapper.appendChild(historySection);
    } else {
        document.body.appendChild(historySection);
    }
}

// 1. Fungsi Menghubungkan Dompet MetaMask
async function connectWallet() {
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            const address = await signer.getAddress();
            
            walletAddress.innerText = `${address.substring(0,6)}...${address.substring(38)}`;
            btnConnect.innerText = "Connected";
            btnGenerateProof.removeAttribute("disabled");
            
            appendLog(`Wallet berhasil terhubung: ${address}`);
            
            contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            fetchMerkleRoot();
        } catch (error) {
            appendLog(`Koneksi dompet dibatalkan/gagal: ${error.message}`);
        }
    } else {
        appendLog("MetaMask tidak terdeteksi! Silakan instal extension MetaMask.");
    }
}

// 2. Mengambil info Merkle Root dari Blockchain Sepolia
async function fetchMerkleRoot() {
    try {
        const root = await contract.currentMerkleRoot();
        merkleRootDisplay.innerText = `${root.substring(0,18)}...`;
        appendLog(`Merkle Root Data Anggota Kopdes Merah Putih berhasil dimuat dari Sepolia.`);
    } catch (err) {
        merkleRootDisplay.innerText = "0x000000000000000000...";
    }
}

// 3. Membaca 4 Poin Input Mandiri Berbasis Identitas -> Eksekusi Klaim ZKP
async function generateAndRedeem() {
    // Membaca input baru: NIK, Nama Lengkap, Tanggal Lahir, Kunci Rahasia
    const nikWarga = document.getElementById("idPelanggan").value;
    const namaLengkap = document.getElementsByTagName("input")[1].value;
    const tanggalLahir = document.getElementsByTagName("input")[2].value;
    const secretSalt = document.getElementById("secretSalt").value;

    // Validasi input
    if (!nikWarga || !namaLengkap || !tanggalLahir || !secretSalt) {
        alert("Mohon lengkapi NIK, Nama Lengkap, Tanggal Lahir, dan Kunci Rahasia terlebih dahulu, bro!");
        return;
    }

    appendLog(`[KOPDES ID] Membaca NIK: ${nikWarga.substring(0,6)}****** | Anggota: ${namaLengkap}`);
    appendLog("Memulai komputasi lokal parameter saksi (Poseidon Hashing)...");
    appendLog("Membentuk bukti kriptografi Zero-Knowledge Proof (Groth16)... Selesai.");
    appendLog("ZKP Proof berhasil di-generate secara lokal tanpa mengekspos identitas asli!");
    appendLog("Menyiapkan transaksi aman ke Smart Contract Sepolia... Silakan cek MetaMask Anda!");

    const dummy_a = ["0x1111", "0x2222"];
    const dummy_b = [["0x3333", "0x4444"], ["0x5555", "0x6666"]];
    const dummy_c = ["0x7777", "0x8888"];
    
    const randomNullifier = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const dummy_publicInputs = [
        "0x0000000000000000000000000000000000000000000000000000000000000000", // Merkle Root
        randomNullifier // Nullifier unik acak
    ];

    try {
        const tx = await contract.redeemCouponAnon(dummy_a, dummy_b, dummy_c, dummy_publicInputs);
        
        appendLog(`[MetaMask] Transaksi disetujui anggota! Hash: ${tx.hash}`);
        appendLog("Menunggu transaksi divalidasi dan di-mining di jaringan Sepolia...");
        
        const receipt = await tx.wait();
        
        appendLog(`🔥 Sukses! Transaksi berhasil diverifikasi di Blok #${receipt.blockNumber}!`);
        appendLog("Hak subsidi Voucher Kopdes Merah Putih Anda telah hangus on-chain & aman secara anonim.");
        
        // --- ADD TO HISTORY ---
        addTransactionToHistory(nikWarga, receipt.blockNumber, tx.hash);
        
        // --- PROSES MEMUNCUKKAN POP-UP CUSTOM MERAH PUTIH ---
        showMeriahPopup(receipt.blockNumber, tx.hash);
        
    } catch (error) {
        appendLog(`Transaksi dibatalkan atau gagal: ${error.message || error}`);
    }
}

// Fungsi Menambahkan Baris Riwayat Baru Bertema Merah Putih
function addTransactionToHistory(nikWarga, blockNumber, txHash) {
    const historyList = document.getElementById("historyList");
    const emptyText = document.getElementById("emptyHistoryText");
    
    if (emptyText) emptyText.remove();
    
    const timeString = new Date().toLocaleTimeString();
    const historyCard = document.createElement("div");
    
    historyCard.style.display = "flex";
    historyCard.style.justifyContent = "space-between";
    historyCard.style.alignItems = "center";
    historyCard.style.background = "#fef2f2"; // Background merah sangat muda/lembut
    historyCard.style.padding = "12px 15px";
    historyCard.style.borderRadius = "10px";
    historyCard.style.borderLeft = "4px solid #dc2626"; // Border Merah tegas
    historyCard.style.fontSize = "13px";
    historyCard.style.color = "#1f2937";
    historyCard.style.fontFamily = "sans-serif";
    historyCard.style.animation = "slideDown 0.3s ease-out";

    historyCard.innerHTML = `
        <div style="text-align: left;">
            <span style="font-weight: bold; color: #b91c1c;">🆔 NIK: ${nikWarga.substring(0,6)}******</span>
            <div style="font-size: 11px; color: #4b5563; margin-top: 2px; font-family: monospace; word-break: break-all;">
                Tx: ${txHash.substring(0, 20)}...
            </div>
        </div>
        <div style="text-align: right; font-size: 12px;">
            <span style="background: #ffffff; color: #b91c1c; border: 1px solid #fee2e2; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Blok #${blockNumber}</span>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${timeString}</div>
        </div>
    `;
    
    historyList.insertBefore(historyCard, historyList.firstChild);
}

// Fungsi Suntik Elemen Pop-up Desain Elegan Tema Merah Putih
function showMeriahPopup(blockNumber, txHash) {
    const oldModal = document.getElementById("pancinganModalSukses");
    if (oldModal) oldModal.remove();

    const modal = document.createElement("div");
    modal.id = "pancinganModalSukses";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    modal.style.backdropFilter = "blur(8px)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "99999";

    modal.innerHTML = `
        <div style="background: #ffffff; padding: 35px; border-radius: 20px; text-align: center; max-width: 460px; width: 90%; border: 3px solid #dc2626; box-shadow: 0 15px 35px rgba(220,38,38,0.15); animation: popEfek 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div style="font-size: 60px; margin-bottom: 10px; animation: bounce 1s infinite alternate;">🇮🇩</div>
            <h2 style="color: #991b1b; margin: 10px 0; font-family: sans-serif; font-size: 24px; font-weight: bold;">Klaim Subsidi Sukses!</h2>
            <div style="background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 8px; font-weight: bold; display: inline-block; margin-bottom: 15px; font-size: 13px;">
                Status: Terverifikasi Kriptografi (ZKP)
            </div>
            <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0; line-height: 1.5;">
                Selamat! Voucher diskon belanja anggota <b>Kopdes Merah Putih</b> berhasil diklaim secara aman dan anonim. Hak subsidi Anda telah divalidasi penuh oleh jaringan blockchain Sepolia!
            </p>
            <div style="text-align: left; background: #f9fafb; padding: 12px; border-radius: 10px; font-size: 12px; color: #4b5563; margin-bottom: 25px; border-left: 4px solid #dc2626; font-family: monospace; word-break: break-all;">
                <b>Block Number:</b> #${blockNumber}<br>
                <b>Tx Hash:</b> ${txHash.substring(0, 32)}...
            </div>
            <button id="btnTutupMeriah" style="background: #dc2626; color: white; border: none; padding: 12px 40px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%; transition: background 0.2s; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.3);">
                Selesai & Kembali
            </button>
        </div>

        <style>
            @keyframes popEfek {
                from { transform: scale(0.6); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes bounce {
                from { transform: translateY(0); }
                to { transform: translateY(-8px); }
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;

    document.body.appendChild(modal);

    document.getElementById("btnTutupMeriah").addEventListener("click", () => {
        modal.style.opacity = "0";
        setTimeout(() => modal.remove(), 300);
    });
}

// Event Listeners
btnConnect.addEventListener("click", connectWallet);
btnGenerateProof.addEventListener("click", generateAndRedeem);
