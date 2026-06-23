# ══════════════════════════════════════
#  BRAND A — Firebase Setup Guide
# ══════════════════════════════════════

## 📁 File Structure
```
brand-A-firebase/
├── index.html          ← Home page
├── shop.html           ← Product shop
├── login.html          ← Login / Register (Google + Email)
├── checkout.html       ← Checkout + Vodafone Cash
├── style.css           ← Global dark gothic styles
├── firebase-config.js  ← Firebase SDK + config
└── SETUP.md            ← This file
```

---

## 🔥 Firebase Console Setup

### 1. Enable Authentication
Go to: Firebase Console → Your Project → Authentication → Sign-in method

Enable:
- ✅ **Email/Password**
- ✅ **Google**

For Google sign-in, add your domain to Authorized Domains:
- Add: `localhost` (for local testing)
- Add: your real domain when deployed

---

### 2. Create Firestore Database
Go to: Firebase Console → Firestore Database → Create Database

Choose **Production mode**, then set these **Security Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Orders: authenticated users can create; only admins can read all
    match /orders/{orderId} {
      allow create: if true; // allow guest checkout
      allow read: if request.auth != null &&
        (resource.data.userId == request.auth.uid ||
         request.auth.token.admin == true);
      allow update, delete: if request.auth.token.admin == true;
    }
  }
}
```

---

### 3. Firestore Data Structure

**Collection: `users`**
```json
{
  "uid": "firebase_uid",
  "displayName": "Ahmed Mohamed",
  "email": "ahmed@gmail.com",
  "photoURL": "https://...",
  "createdAt": "timestamp"
}
```

**Collection: `orders`**
```json
{
  "customer": {
    "name": "Ahmed Mohamed",
    "phone": "01012345678",
    "city": "Cairo",
    "notes": ""
  },
  "items": [
    { "name": "SKULL CLASSIC", "price": 349, "size": "L", "qty": 2 }
  ],
  "total": 698,
  "status": "pending",
  "paymentMethod": "Vodafone Cash",
  "userId": "firebase_uid_or_guest",
  "userEmail": "ahmed@gmail.com",
  "createdAt": "timestamp"
}
```

---

### 4. View Orders (Admin)
Go to: Firebase Console → Firestore Database → orders collection

You'll see all customer orders there with full details.

---

## 🚀 How to Deploy (Free Hosting)

### Option A: Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select your project: a-store-3ae5c
# Public directory: . (current folder)
# Single-page app: No
firebase deploy
```

### Option B: Netlify (Drag & Drop)
1. Go to netlify.com
2. Drag the entire `brand-A-firebase` folder
3. Done! You get a free HTTPS URL

### Option C: GitHub Pages
1. Push folder to GitHub repo
2. Settings → Pages → Deploy from branch

---

## ⚠️ Important Notes

1. **Authorized Domains**: After deploying, add your domain to:
   Firebase Console → Authentication → Settings → Authorized domains

2. **HTTPS Required**: Google Sign-In only works on HTTPS or localhost.
   All hosting options above provide HTTPS automatically.

3. **ES Modules**: The site uses `type="module"` scripts.
   Must be served from a web server (not opened as file://).
   For local testing: use VS Code Live Server or `npx serve .`

---

## 📱 Vodafone Cash Number
Update the phone number in `checkout.html`:
Search for `010 0000 0000` and replace with your actual number.

---

## 🎨 Customization
- **Products**: Edit the `products` array in `shop.html`
- **Colors**: Edit CSS variables in `style.css` (`:root` block)
- **Logo image**: Replace the base64 skull with your own image
