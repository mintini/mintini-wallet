# 🪙 Mintini Wallet

**Mintini Wallet** is a lightweight and secure crypto wallet for the **Mintlayer** network. It allows users to manage their digital assets safely, generate and store private keys locally, and send transactions.

## 🚀 Features

- 🔐 **Key generation & local storage** (keys are securely stored in IndexedDB)
- 📜 **Address creation and management**
- 💸 **Send and receive transactions**
- 📊 **View transaction history**
- 🌐 **Token swaps**
- 📈 **Staking**
- ⚡ **Fast and intuitive UI**

## 🛠️ Verify deployment

To ensure that the Mintini Wallet you are using is the **exact** version built from this repository, follow these steps:

### 1️⃣ Find the Latest Release
- Go to the [Releases Page](https://github.com/mintini/mintini-wallet/releases/latest).
- Download the file **`build-hashes.txt`**, which contains the SHA256 hashes of all files in the `dist/` folder.

### 2️⃣ Get the Hash of a Deployed File
To verify a file served from **Vercel**, download it using `curl`:

```sh
curl -sL https://tgapp.mintini.app/assets/YOUR_FILE.js -o downloaded-file.js
```
(Replace YOUR_FILE.js with the actual filename from build-hashes.txt.)

### 3️⃣ Calculate the SHA256 Hash

Run the following command in your terminal to generate the hash of the downloaded file:

```sh
shasum -a 256 downloaded-file.js
```

or 

```PowerShell
Get-FileHash downloaded-file.js -Algorithm SHA256
```

### Compare Hashes

- Open build-hashes.txt from the GitHub release.
- Find the matching file and compare its SHA256 hash with the one you just calculated.

✅ If the hashes match, the deployed file is identical to the one built from the source code.

❌ If they do not match, do not trust the deployment and report the issue.

## 🔧 Installation & Setup

To run Mintini Wallet locally, follow these steps:

1. **Clone the repository:**
   ```sh
   git clone https://github.com/mintini/mintini-wallet.git
   cd mintini-wallet
   ```
   
2. **Install dependencies:**
   ```sh
    npm install
    ```
   
3. **Start the development server:**
   ```sh
   npm run dev
   ```
   
   The development server should now be running at `http://localhost:3000`.

4. **Build the project:**
   ```sh
   npm run build
   ```
   
## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for more information.

