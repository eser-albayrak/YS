# Yönetim Sistemi

Artık **paylaşımlı bir sunucu üzerinden çalışır**: tüm veri (giriş fişleri, lotlar, malzemeler,
CoA/TDS/MSDS PDF'leri) ağdaki Windows sunucunuzda, `Data` klasörünüzün altında gerçek dosyalar
olarak tutulur. Aynı ağdaki her bilgisayar ve telefon aynı adrese bağlanarak aynı veriyi görür.

## Mimari

```
Tarayıcı (PC / Telefon)  ──HTTP──►  Node.js sunucu (server/server.js)  ──► Data/GKYS/ klasörü
     React arayüzü                  Express API                            JSON + gerçek PDF'ler
```

- **Frontend**: React + TypeScript (Vite ile derlenir, `dist/` klasörüne çıkar)
- **Backend**: `server/server.js` — sade Node.js + Express, ekstra kütüphane gerektirmez
- **Veri**: `DATA_DIR` ortam değişkeninin gösterdiği klasörde `db.json`, `materials.json`,
  `suppliers.json`, `label-settings.json` ve `uploads/` (gerçek PDF dosyaları) olarak tutulur
- **QR Kod**: Etiketlerde artık barkod yerine QR kod var — hem USB okuyucu hem telefon
  kamerasıyla (Depo Çıkışı ekranındaki "📷 Telefon Kamerasıyla Tara" butonu) okutulabilir
- Node.js/Express kodu işletim sisteminden bağımsızdır — Windows'ta hiçbir kod değişikliği
  gerekmez, sadece kurulum adımları farklıdır (aşağıda).

## Windows Sunucuda Kurulum

### 1. Node.js kurulumu

Sunucuya RDP ile bağlanıp:

1. https://nodejs.org adresinden **LTS** sürümünün Windows Installer (.msi) dosyasını indirin
   (veya sunucuda internet erişimi kısıtlıysa, başka bir bilgisayarda indirip kopyalayın)
2. İndirilen `.msi` dosyasını çalıştırıp varsayılan ayarlarla kurun
3. Kurulum sonrası yeni bir **PowerShell** açıp doğrulayın:

```powershell
node -v
npm -v
```

Sürüm numaraları görünüyorsa kurulum tamamdır.

### 2. "Data" paylaşımının sunucudaki gerçek yolunu bulma

`\\ad\shares$\DATA` — ağdaki bilgisayarların gördüğü paylaşım yolu. Sunucunun kendi diskindeki
**gerçek yerel yolu** bulmak için sunucuda PowerShell açıp:

```powershell
Get-SmbShare | Format-Table Name, Path
```

Listede `DATA$` (veya paylaşım adınız neyse) satırını bulun — yanındaki `Path` sütunu (örn.
`D:\Data`), aşağıda `DATA_DIR` olarak kullanacağınız yerel yoldur. Bu komut çalışmazsa, eski
usül `net share` komutu da aynı bilgiyi verir.

### 3. Projeyi sunucuya kopyalama ve kurulum

Bu klasörü (YS (Yönetim Sistemi)) sunucuya kopyalayın (örn. `C:\YS (Yönetim Sistemi)`), sonra PowerShell'de:

```powershell
cd C:\YS (Yönetim Sistemi)

# Frontend bağımlılıklarını kurup derleyin
npm install
npm run build

# Sunucu bağımlılıklarını kurun (sadece express)
npm run server:install
```

### 4. Ayar dosyasını düzenleme ve çalıştırma

`server\start-server.bat` (veya `server\start-server.ps1`) dosyasını Not Defteri ile açıp en
üstteki satırı kendi gerçek Data yolunuzla değiştirin:

```
set DATA_DIR=D:\Data\GKYS
```

Kaydedip `start-server.bat` dosyasına **çift tıklayın**. Bir komut penceresi açılıp sunucunun
çalıştığını gösterecek. Tarayıcıdan `http://SUNUCU-IP` adresine gidildiğinde arayüz açılır (port
numarası yazmaya gerek yok, sunucu varsayılan olarak 80 portunda çalışıyor). Aynı ağdaki telefon
da aynı adrese girerek erişir. (Sunucunun IP adresini görmek için sunucuda `ipconfig` çalıştırıp
"IPv4 Address" satırına bakabilirsiniz.)

Not: Sunucuda IIS gibi başka bir program zaten 80 portunu kullanıyorsa, dosyadaki `PORT=80`
satırını `PORT=8080` gibi boş bir port ile değiştirin — bu durumda adres `http://SUNUCU-IP:8080`
olur.

### 5. IP yerine kolay bir isimle erişim (örn. http://hammadde)

IP adresini ezberlemek/yazmak yerine kolay bir isim kullanmak için Active Directory DNS
sunucunuza bir kayıt eklemeniz gerekir:

1. AD DNS sunucusunda (genelde domain controller) **DNS Manager** açın (`dnsmgmt.msc`)
2. İlgili bölgede (zone) sağ tık → **Yeni Ana Bilgisayar (A veya AAAA)** (New Host)
3. Ad: `hammadde` (istediğiniz herhangi bir isim), IP adresi: sunucunun IP'si
4. Kaydedin

Birkaç dakika içinde ağdaki tüm cihazlardan `http://hammadde` yazarak erişebilirsiniz —
IP yazmaya ya da hatırlamaya gerek kalmaz. Bu adımı sizin yerinize IT/domain yöneticiniz de
yapabilir; sadece sunucunun IP adresini ve istediğiniz ismi ("hammadde") ona iletmeniz yeterli.

### 6. Sürekli açık kalması (7/24)

Komut penceresini kapatırsanız sunucu durur. Bilgisayar yeniden başlasa bile otomatik ayağa
kalkması için iki seçenek var:

**Seçenek A — Görev Zamanlayıcı (Task Scheduler), ekstra kurulum gerektirmez:**

1. Başlat menüsünden "Görev Zamanlayıcı" (Task Scheduler) açın
2. Sağdan "Temel Görev Oluştur" (Create Basic Task)
3. Tetikleyici: "Bilgisayar başlatıldığında" (When the computer starts)
4. Eylem: "Program Başlat" → Program: `C:\YS (Yönetim Sistemi)\server\start-server.bat`
5. Bittiğinde görevi bulun, sağ tık → Özellikler → "En yüksek ayrıcalıklarla çalıştır" işaretleyin

**Seçenek B — Gerçek Windows Servisi (NSSM ile), daha sağlam (çökerse otomatik yeniden başlar):**

1. https://nssm.cc/download adresinden NSSM'i indirin, `nssm.exe`'yi örn. `C:\nssm\` klasörüne
   çıkarın
2. PowerShell'i **yönetici olarak** açıp:

```powershell
cd C:\nssm\win64
.\nssm.exe install GKYSSolo
```

3. Açılan pencerede:
   - **Path**: `C:\Program Files\nodejs\node.exe`
   - **Startup directory**: `C:\YS (Yönetim Sistemi)`
   - **Arguments**: `server\server.js`
   - "Environment" sekmesinde: `DATA_DIR=D:\Data\GKYS` ve `PORT=80` satırlarını ekleyin
4. "Install service" ile kaydedin, sonra:

```powershell
Start-Service GKYSSolo
```

Artık sunucu Windows ile birlikte otomatik başlar ve çökerse kendini yeniden başlatır.

### 7. Güvenlik duvarı

Windows Güvenlik Duvarı 80 portunu yerel ağa kapatıyor olabilir, açmak için (yönetici
PowerShell):

```powershell
New-NetFirewallRule -DisplayName "GKYS Solo" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

(Farklı bir port kullanıyorsanız `-LocalPort` değerini ona göre değiştirin.)

## Geliştirme Ortamında Çalıştırma (bu bilgisayarda test için)

İki ayrı süreç gerekir — API sunucusu ve Vite geliştirme sunucusu:

```bash
# Terminal 1 — API sunucusu (test verisiyle, 4000 portunda)
npm run server:install
npm run server:dev

# Terminal 2 — Vite (5173 portunda, /api isteklerini otomatik 4000'e yönlendirir)
npm install
npm run dev
```

## Telefonla QR Okutma

1. Telefon ve bilgisayarın **aynı WiFi ağında** olduğundan emin olun.
2. Telefonun tarayıcısından `https://SUNUCU-IP:3443` (veya DNS kaydı varsa `https://hammadde:3443`) adresine gidin.
3. "4. Depo Çıkışı" sekmesine girin, **"📷 Telefon Kamerasıyla Tara"** butonuna basın, tarayıcı
   kamera izni isteyecektir — izin verin.
4. Etikette basılı QR kodu kameraya gösterin, otomatik okunur.

Not: Kamera erişimi güvenlik gereği sadece HTTPS veya `localhost` üzerinden çalışır. Telefonunuzdan
`http://...` bağlantısı ile QR kamera çoğu tarayıcıda açılmaz. `https://...` adresini kullanmak için
`server/certs/README.md` içindeki mkcert talimatlarını izleyip telefonunuza kök sertifikayı yükleyin.

## Kullanıcılar ve Roller (V3 — Faz 0)

Sistem artık **kullanıcı adı/şifre ile giriş** gerektiriyor; her kullanıcının bir rolü var ve
her rol yalnızca kendisiyle ilgili sekmeleri görebiliyor.

- **İlk çalıştırmada** otomatik olarak bir yönetici hesabı oluşturulur:
  **Kullanıcı adı: `admin`  Şifre: `admin123`**
  Sunucu ilk kez ayağa kalktığında bu bilgi konsola da yazdırılır.
  **Güvenlik için ilk girişten hemen sonra "Yönetim Paneli" sekmesinden bu şifreyi değiştirin.**
- Yeni kullanıcı ekleme, rol atama, şifre sıfırlama ve pasife alma işlemleri **Yönetim Paneli**
  sekmesinden yapılır (sadece **Yönetici** rolü bu sekmeyi görür).
- Roller: `Yönetici`, `Giriş Kalite`, `Depo`, `Satın Alma`, `Üretim`, `Raporlama`, `Misafir`.
  Her rolün hangi sekmeleri gördüğü `src/App.tsx` içindeki `ROLE_TABS` tablosunda tanımlıdır;
  yeni modüller eklendikçe bu tablo genişletilecektir.
- Tüm önemli işlemler (giriş/çıkış, kalite onayı, malzeme değişikliği, kullanıcı işlemleri vb.)
  **İşlem Kayıtları (Audit Log)** olarak Yönetim Paneli'nde görüntülenebilir — bu kayıtlar
  hiçbir zaman silinmez.
- Oturum bilgisi (token) tarayıcıda 12 saat geçerlidir, süresi dolunca otomatik olarak giriş
  ekranına yönlendirilir.

## İş Akışı

1. **Mal Kabul** — Giriş fişi oluştur, malzeme/firma otomatik tamamlamalı
2. **Kalite Kontrol** — CoA değerleri girilince spec aralığıyla otomatik OK/NG karşılaştırması
3. **Etiket Basım** — Onaylanan lotlar için QR kodlu etiket, ambalaj miktarı otomatik önerilir
   (Malzeme Tanımları'nda tanımlıysa), yazdırınca "depoya teslim" durumuna geçer
4. **Depo Çıkışı** — USB okuyucu veya telefon kamerasıyla QR okutulunca, standart ambalajı
   tanımlı malzemelerde onay beklemeden otomatik stok düşümü + "Geri Al" güvenlik butonu
5. **Depo Stok Takip** — Filtrelenebilir dashboard, grafikler, lot detay tablosu, Excel/PDF/
   yazdırma
6. **Geçmiş** — Tüm hareketler ve reddedilen lotlar
7. **Malzeme Tanımları** — Yeni malzeme ekleme/düzenleme, standart ambalaj miktarı, TDS/MSDS
   yükleme (mouse ile önizleme)
8. **Yedekleme** — Tüm veritabanının tek dosyalık taşınabilir JSON yedeği (veri zaten sunucuda
   kalıcı olduğu için bu ekstra bir güvenlik kopyasıdır)

## Klasör Yapısı

```
src/                     - React frontend
  lib/api.ts              - Sunucu API'sine istek atan merkezi istemci
  lib/storage.ts           - Giriş/lot/hareket işlemleri (async, API üzerinden)
  lib/materialsStorage.ts   - Malzeme/firma işlemleri (async, API üzerinden)
  lib/fileUtils.ts          - PDF doğrulama ve sunucuya yükleme
  components/               - Ekranlar
server/
  server.js                - Express API + statik dosya sunumu
  seed/                     - İlk açılışta kullanılan Excel kaynaklı malzeme/firma verisi
```
