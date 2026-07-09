# Infinite Runner

🎮 **Oyna:** https://armin1142.github.io/infinite-runner/

Tarayıcıda çalışan bir koşu/parkur oyunu. Karakter kendi kendine ileri koşar, boşluk tuşuyla zıplayıp dikenlerden ve lav çukurlarından kaçarsın (mobilde ekrana dokun). `index.html`'i çift tıklayıp açman da yeterli.

## Nasıl oynanır

- Ana menüde 🌐 açılır listesinden dil seçebilirsin (Türkçe, English, العربية, 中文, Français).
- İsmini yaz, **Başla** butonuna bas.
- **Boşluk tuşu** ile zıpla (mobilde ekranın herhangi bir yerine dokun); dikenlerin/blokların üzerinden atla, lav çukurlarını havadan geç.
- Belirli mesafelerde orman → park → fabrika bölgeleri arasında yumuşak geçişle değişim olur (arkaplan ve engel renkleri).
- 🔵 mavi **helikopter tokenı** topla: bir süreliğine (9 saniye) karakter **helikoptere** dönüşür — boşluğu **basılı tutarak** yüksel, bırakınca alçalırsın; borulardaki boşluktan geç.
- 🪙 altın coinleri topla (hem anlık puan hem kalıcı para — karakter özelleştirmede harcanır).
- 💜 mor coin bir **güç modu** açar: birkaç saniye boyunca daha yüksek zıplarsın.
- **🎨 Karakter** butonuyla topladığın coinlerle renk, şapka ve gözlük açıp karakterine giydirebilirsin.
- Bir engele çarpınca oyun biter; skor otomatik olarak liderlik tablosuna gönderilir. **Tekrar oyna** ile yeniden başlarsın.
- **🏆 Liderlik Tablosu** butonuyla herkesin en iyi skorlarını görebilirsin (isme göre en yüksek skor, ilk 10).

## Dosyalar

- `index.html` — sayfa yapısı, menü/özelleştirme/liderlik tablosu/oyun-bitti ekranları, HUD
- `style.css` — görsel tasarım
- `script.js` — oyun fiziği, bölgeler, helikopter bölümleri, engel/coin üretimi (rastgele), çarpışma, güç modu, karakter özelleştirme, ses efektleri, skor, liderlik tablosu
- `firebase-config.js` — liderlik tablosunun bağlandığı Firebase projesinin ayarları (gizli değil, bkz. aşağıda)

## Liderlik tablosu kurulumu (bir kereye mahsus)

Herkese açık/paylaşılan liderlik tablosu için ücretsiz bir Firebase (Google) projesi gerekiyor — bunu senin hesabınla kurman lazım, ben senin adına oluşturamam:

1. [console.firebase.google.com](https://console.firebase.google.com) adresine git, Google hesabınla gir.
2. **"Add project"** ile yeni bir proje oluştur (Google Analytics'i kapatabilirsin, gerekmiyor).
3. Proje açılınca **"</>"** (web app) simgesine tıkla, bir isim ver, kaydet.
4. Sana bir `firebaseConfig = { apiKey: ..., ... }` nesnesi gösterecek — bunu kopyala.
5. Sol menüden **Firestore Database** → **Create database** → **test mode** (veya aşağıdaki kuralları kullan) ile bir veritabanı oluştur.
6. Firestore'da **Rules** sekmesine gidip şunu yapıştır (skorların silinmesini/değiştirilmesini engeller, sadece geçerli skor eklemeye izin verir):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /scores/{scoreId} {
         allow read: if true;
         allow create: if request.resource.data.name is string
                       && request.resource.data.name.size() > 0
                       && request.resource.data.name.size() <= 20
                       && request.resource.data.score is int
                       && request.resource.data.score >= 0
                       && request.resource.data.score <= 100000;
         allow update, delete: if false;
       }
     }
   }
   ```

7. Kopyaladığın `firebaseConfig` nesnesini `firebase-config.js` dosyasındaki `FIREBASE_CONFIG` içine yapıştır (değerleri `YOUR_...` yerine kendi değerlerinle değiştir).

Bu adımları tamamlayana kadar oyun **yine de tamamen çalışır** — sadece liderlik tablosu "şu an kullanılamıyor" mesajı gösterir, skor gönderimi sessizce atlanır.

## Notlar

- En iyi skor ve karakter özelleştirme (kalıcı coin, açılan renk/şapka/gözlük) bu cihazda `localStorage` ile saklanıyor, liderlik tablosu ise Firebase üzerinde herkese açık.
- `firebase-config.js` içindeki değerler gizli bilgi değildir — Firebase'in web API anahtarı tarayıcıda görünmesi için tasarlanmıştır, güvenlik yukarıdaki Firestore kurallarıyla sağlanır. GitHub'a göndermekte sakınca yok.
- Ses efektleri dosya değil, doğrudan tarayıcıda üretiliyor (Web Audio `OscillatorNode`) — internet gerekmiyor (liderlik tablosu hariç).
