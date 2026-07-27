DEPLOYATION & WINDOWS SERVER KURULUM TALİMATLARI (IT EKİBİ İÇİN)

Bu doküman, eaggyea/YS projesinin Windows Server üzerine kalıcı olarak kurulumunu, servis olarak çalıştırılmasını, güvenlik duvarı ve erişim ayarlarını adım adım açıklar. Aşağıdaki adımlar sunucuda Yönetici (Administrator) yetkisiyle uygulanmalıdır.

Güvenlik ön notu
- Herhangi bir GitHub Personal Access Token (PAT) buraya yapıştırmayın. Kullanıcı bu token'ı paylaştıysa hemen iptal edin (revoke) ve yeni, sınırlı izinli bir token oluşturun.

1) Sunucu ön koşulları
- Windows Server (2016/2019/2022) – en güncel güvenlik yamaları uygulanmış
- Node.js LTS (en az 16+) yüklü
- Yönetici hesabı ile PowerShell erişimi
- Gerekirse NSSM (Non-Sucking Service Manager) veya benzeri bir Windows servis wrapper

2) Kodun sunucuya alınması (IT tercihine göre)
Seçenek A — Git kullanarak
- Sunucuda Git yüklü ise (ve sunucudan GitHub'a erişim izni varsa):
  cd C:\inetpub\wwwroot\YS
  git clone https://github.com/eaggyea/YS.git .
  # veya specific branch
  git clone --branch main https://github.com/eaggyea/YS.git .

Seçenek B — ZIP / kopyalama
- Geliştirici tarafından GitHub sayfasında "Code -> Download ZIP" kullanılarak veya dosyalar başka bir yol ile sunucuya kopyalanabilir (örn. SFTP, SMB paylaşımı).

3) Node.js kurulum doğrulama
PowerShell (Yönetici):

node -v
npm -v

4) Ortam değişkenleri ve Data klasörü
- Sunucuda kalıcı veri dizini (paylaşılan Data klasörü) örn: D:\Data\GKYS olarak belirlenmelidir.
- Bu dizini `DATA_DIR` ortam değişkeni veya servis tanımında kullanın.

Örnek ortam değişkenleri (PowerShell ile kalıcı olarak):

setx DATA_DIR "D:\Data\GKYS" /M
setx NODE_ENV "production" /M
setx PORT "80" /M

Not: setx kullandıktan sonra yeni shell açılmalıdır.

5) Bağımlılıkların kurulması ve derleme
Proje kökünde (ör: C:\gkys-solo):

cd C:\gkys-solo
npm install --production --no-audit --no-fund
npm run build

Bu, frontend dosyalarını `dist/` içine koyacaktır. Eğer sunucu ayrı bir process (ör. server/server.js) ile başlıyorsa buna dikkat edin.

6) Sunucunun servis olarak kurulması — Önerilen: NSSM
- NSSM indirin: https://nssm.cc/download
- nssm.exe'yi örn. C:\nssm\win64\nssm.exe olarak kopyalayın

PowerShell (Yönetici) ile örnek adımlar:

cd C:\nssm\win64
.\nssm.exe install GKYSSolo

NSSM arayüzünde girilecek değerler:
- Path: C:\Program Files\nodejs\node.exe
- Startup directory: C:\gkys-solo
- Arguments: server\\server.js

Environment sekmesine ekleyin:
DATA_DIR=D:\Data\GKYS
PORT=80
NODE_ENV=production

Install diyip servisi kaydedin.

Sonra servis başlatın:

Start-Service GKYSSolo

Servis loglarını görmek için Event Viewer veya nssm stdout/stderr log konfigürasyonunu kullanın.

Alternatif: PM2 + pm2-windows-service
- pm2 Windows üzerinde de çalışır; pm2-windows-service ile Node sürecini yönetin. (Ancak NSSM daha basit ve güvenilirdir).

7) Windows Güvenlik Duvarı
Ağın ilgili makinelerinden erişime izin vermek için:

New-NetFirewallRule -DisplayName "GKYS Solo" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

Eğer 443 (HTTPS) kullanılacaksa hem 80 hem 443 portlarını açın ve HTTPS terminasyonu için IIS/ARR veya reverse proxy planlayın.

8) SSL/HTTPS ve QR Kamera Erişimi
- QR kamera tarayıcısı HTTPS üzerinde çalışır; üretimde HTTPS kurulumu önerilir.
- IIS (Application Request Routing) veya reverse proxy (nginx/traefik) ile port 443 konfigüre edilebilir.
- Sertifika: kurum içi CA veya Let's Encrypt (eğer dışarıdan erişim varsa)

9) DNS / Kolay Hostname (IT tarafı)
- AD DNS'de yeni A kaydı oluşturun: örn. hammadde -> SUNUCU_IP
- İç ağ kullanıcıları bu isimle erişir: http://hammadde veya https://hammadde

10) Diğer kullanıcıların erişimi
- Aynı ağdaki kullanıcılar tarayıcıdan sunucu IP'si veya DNS adı ile erişir.
- Varsayılan olarak 80 portu kullanılıyorsa sadece http://SUNUCU-IP yeterlidir.
- Eğer HTTPS uygulanırsa: https://hammadde

11) Yedekleme
- DATA_DIR içindeki dosyaların düzenli yedeğini alın (ör. günlük artımlı yedek + haftalık tam yedek).
- db.json vb. dosyaların bütünlük kontrolleri ile yedeklenmesi önerilir.

12) Log, Audit ve Hata Bildirimi
- NSSM veya servis stdout/stderr loglarını dosyaya yönlendirin.
- Kritik hata durumunda servisi yeniden başlatacak izleme/alert sistemi kurulması önerilir.

13) Ek: scripts/install-nssm-service.ps1
- Bu repo altında `scripts/install-nssm-service.ps1` örnek betiği hazırlanmıştır. Yönetici PowerShell ile çalıştırılacaktır.

14) GitHub üzerinden deploy (geliştirici/operasyon)
- Geliştirici yerel makinede şu komutları kullanarak repo'yu remote'a push eder:

# sadece örnek — token buraya yazılmamalı
git init
git add .
git commit -m "Initial commit"
# remote ekle (HTTPS)
git remote add origin https://github.com/eaggyea/YS.git
# push
git push -u origin main

Öneri: Sunucunun GitHub erişimi yoksa geliştirici zip olarak dosyaları paylaşıp IT ekibi sunucuya kopyalayabilir.

15) Son notlar — IT'ye iletilecek bilgiler (kısa özet)
- Uygulama kök yolu: C:\gkys-solo
- Node.js path: C:\Program Files\nodejs\node.exe
- Data dizini (ör): D:\Data\GKYS
- Servis adı: GKYSSolo
- Port: 80
- DNS kayıt isteği: hammadde -> SUNUCU_IP

Bu dokümanda yer alan adımlar uygulandıktan sonra uygulama ağa açılmalı ve kullanıcılar tarayıcıdan erişebilmelidir. İstenirse bu dokümanı GitHub README içine de entegre edebilirim.