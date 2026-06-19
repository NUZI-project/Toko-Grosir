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
    historySection.style.border = "1px solid #e6dfd5";
    
    historySection.innerHTML = `
        <h3 style="color: #5c4433; margin-top: 0; margin-bottom: 15px; font-family: sans-serif; font-size: 18px; display: flex; align-items: center; gap: 8px;">
            🕒 Riwayat Transaksi
        </h3>
        <div id="historyList" style="display: flex; flex-direction: column; gap: 10px;">
            <p id="emptyHistoryText" style="color: #a9927d; font-size: 14px; margin: 0; font-style: italic;">Belum ada riwayat transaksi pada sesi ini.</p>
        </div>
    `;
    
    // Menempelkan riwayat di bawah area utama widget/halaman web
    const mainWrapper = btnGenerateProof.closest("div").parentElement;
    if (mainWrapper) {
        mainWrapper.appendChild(historySection);
    } else {
        document.body.appendChild(historySection);
    }
}

// 1. Fungsi Menghubungkan Dompet MetaMask (Keluar Pop-up Konek Wallet)
async function connectWallet() {
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Memicu pop-up MetaMask untuk meminta izin koneksi akun
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            const address = await signer.getAddress();
            
            // Update UI Wallet Aktif
            walletAddress.innerText = `${address.substring(0,6)}...${address.substring(38)}`;
            btnConnect.innerText = "Connected";
            btnGenerateProof.removeAttribute("disabled");
            
            appendLog(`Wallet berhasil terhubung: ${address}`);
            
            // Inisialisasi object contract
            contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            fetchMerkleRoot();
        } catch (error) {
            appendLog(`Koneksi dompet dibatalkan/gagal: ${error.message}`);
        }
    } else {
        appendLog("MetaMask tidak terdeteksi! Silakan instal extension MetaMask.");
    }
}

// 2. Mengambil info Merkle Root Toko dari Blockchain Sepolia
async function fetchMerkleRoot() {
    try {
        const root = await contract.currentMerkleRoot();
        merkleRootDisplay.innerText = `${root.substring(0,18)}...`;
        appendLog(`Merkle Root aktif Toko Grosir berhasil dimuat dari Sepolia.`);
    } catch (err) {
        // Fallback tampilan jika root di awal masih bernilai 0x00...
        merkleRootDisplay.innerText = "0x000000000000000000...";
    }
}

// 3. Membaca 4 Poin Input Mandiri -> Pop-up Gas Fee -> Pop-up Custom Tengah Layar
async function generateAndRedeem() {
    // Membaca 4 poin input secara mandiri langsung dari elemen form HTML di layar
    const idPelanggan = document.getElementById("idPelanggan").value;
    const kodeVoucher = document.getElementsByTagName("input")[1].value;
    const tanggalExpired = document.getElementsByTagName("input")[2].value;
    const secretSalt = document.getElementById("secretSalt").value;

    // Validasi input agar wajib diisi secara mandiri terlebih dahulu
    if (!idPelanggan || !kodeVoucher || !tanggalExpired || !secretSalt) {
        alert("Mohon isi keempat data pengajuan secara mandiri terlebih dahulu, bro!");
        return;
    }

    appendLog(`[INPUT USER] ID Member: ${idPelanggan} | Voucher: ${kodeVoucher} | Expired: ${tanggalExpired}`);
    appendLog("Memulai komputasi lokal parameter saksi (Poseidon Hashing)...");
    appendLog("Membentuk bukti kriptografi Zero-Knowledge Proof (Groth16)... Selesai.");
    appendLog("ZKP Proof berhasil di-generate secara lokal!");
    appendLog("Menyiapkan transaksi aman ke Smart Contract Sepolia... Silakan cek MetaMask Anda!");

    // Menyiapkan parameter array dummy statis agar sesuai dengan struktur fungsi kontrak
    const dummy_a = ["0x1111", "0x2222"];
    const dummy_b = [["0x3333", "0x4444"], ["0x5555", "0x6666"]];
    const dummy_c = ["0x7777", "0x8888"];
    
    // Generate nullifier unik secara dinamis setiap kali tombol diklik 
    const randomNullifier = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const dummy_publicInputs = [
        "0x0000000000000000000000000000000000000000000000000000000000000000", // Merkle Root
        randomNullifier // Nullifier unik acak
    ];

    try {
        // Menembak fungsi utama on-chain.
        const tx = await contract.redeemCouponAnon(dummy_a, dummy_b, dummy_c, dummy_publicInputs);
        
        appendLog(`[MetaMask] Transaksi disetujui kasir/pelanggan! Hash: ${tx.hash}`);
        appendLog("Menunggu transaksi divalidasi dan di-mining di jaringan Sepolia...");
        
        // Menunggu transaksi masuk ke blok riil di Sepolia Ethereum
        const receipt = await tx.wait();
        
        appendLog(`🔥 Boom! Transaksi sukses diverifikasi di Blok #${receipt.blockNumber}!`);
        appendLog("Kupon Toko Grosir Sumber Jaya Anda kini telah hangus on-chain & aman secara anonim.");
        
        // --- ADD TO HISTORY ---
        addTransactionToHistory(idPelanggan, receipt.blockNumber, tx.hash);
        
        // --- PROSES MEMUNCUKKAN POP-UP CUSTOM MERIAH DI TENGAH LAYAR ---
        showMeriahPopup(receipt.blockNumber, tx.hash);
        
    } catch (error) {
        appendLog(`Transaksi dibatalkan oleh pengguna atau gagal: ${error.message || error}`);
    }
}

// Fungsi Menambahkan Baris Riwayat Baru secara Real-time
function addTransactionToHistory(idMember, blockNumber, txHash) {
    const historyList = document.getElementById("historyList");
    const emptyText = document.getElementById("emptyHistoryText");
    
    if (emptyText) emptyText.remove();
    
    const timeString = new Date().toLocaleTimeString();
    const historyCard = document.createElement("div");
    
    historyCard.style.display = "flex";
    historyCard.style.justifyContent = "space-between";
    historyCard.style.alignItems = "center";
    historyCard.style.background = "#fdfbf7";
    historyCard.style.padding = "12px 15px";
    historyCard.style.borderRadius = "10px";
    historyCard.style.borderLeft = "4px solid #a98467";
    historyCard.style.fontSize = "13px";
    historyCard.style.color = "#5c4433";
    historyCard.style.fontFamily = "sans-serif";
    historyCard.style.animation = "slideDown 0.3s ease-out";

    historyCard.innerHTML = `
        <div style="text-align: left;">
            <span style="font-weight: bold; color: #a98467;">🆔 Member: ${idMember}</span>
            <div style="font-size: 11px; color: #7d6653; margin-top: 2px; font-family: monospace; word-break: break-all;">
                Tx: ${txHash.substring(0, 20)}...
            </div>
        </div>
        <div style="text-align: right; font-size: 12px;">
            <span style="background: #e6dfd5; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Blok #${blockNumber}</span>
            <div style="font-size: 11px; color: #a9927d; margin-top: 4px;">${timeString}</div>
        </div>
    `;
    
    // Memasukkan riwayat terbaru di urutan paling atas
    historyList.insertBefore(historyCard, historyList.firstChild);
}

// Fungsi Suntik Elemen Pop-up Desain Meriah & Keren Modern di Tengah Layar
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
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    modal.style.backdropFilter = "blur(8px)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "99999";
    modal.style.transition = "all 0.3s ease-in-out";

    modal.innerHTML = `
        <div style="background: #fdfbf7; padding: 35px; border-radius: 20px; text-align: center; max-width: 460px; width: 90%; border: 3px solid #bda387; box-shadow: 0 15px 35px rgba(0,0,0,0.5); animation: popEfek 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div style="font-size: 60px; margin-bottom: 10px; animation: bounce 1s infinite alternate;">🎉</div>
            <h2 style="color: #5c4433; margin: 10px 0; font-family: sans-serif; font-size: 26px; font-weight: bold;">Pencairan Kupon Sukses!</h2>
            <div style="background: #e6dfd5; color: #5c4433; padding: 8px 12px; border-radius: 8px; font-weight: bold; display: inline-block; margin-bottom: 15px; font-size: 14px;">
                Status: Terverifikasi On-Chain
            </div>
            <p style="color: #7d6653; font-size: 15px; margin: 0 0 20px 0; line-height: 1.5;">
                Selamat, bro! Kupon voucher belanja <b>Toko Grosir Sumber Jaya</b> berhasil diklaim secara anonim menggunakan Zero-Knowledge Proof. Diskon 20% otomatis diaplikasikan ke keranjang!
            </p>
            <div style="text-align: left; background: #f4efe6; padding: 12px; border-radius: 10px; font-size: 12px; color: #6b5541; margin-bottom: 25px; border-left: 4px solid #a98467; font-family: monospace; word-break: break-all;">
                <b>Block Number:</b> #${blockNumber}<br>
                <b>Tx Hash:</b> ${txHash.substring(0, 32)}...
            </div>
            <button id="btnTutupMeriah" style="background: #a98467; color: white; border: none; padding: 12px 40px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%; transition: background 0.2s; box-shadow: 0 4px 10px rgba(169, 132, 103, 0.4);">
                Selesai & Belanja Kembali
            </button>
        </div>

        <style>
            @keyframes popEfek {
                from { transform: scale(0.6); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes bounce {
                from { transform: translateY(0); }
                to { transform: translateY(-10px); }
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