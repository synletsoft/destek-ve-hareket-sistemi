# Destek ve Hareket Sistemi 3B

Kemik, eklem ve eklem bağlarını kaynak model ve bilgi kartlarıyla inceleyen, tarayıcıda çalışan eğitim uygulaması.

## Çalıştırma

Bu klasörde `python3 -m http.server 8765` komutunu çalıştırıp `http://localhost:8765` adresini açın. Three.js modülleri CDN üzerinden yüklendiği için ilk açılışta internet bağlantısı gerekir.

## Kullanım

- Başlangıçta kemikler görünür; Eklemler ve Eklem Bağları kapalıdır. Kemikler daima görünür ve kendi düğmesi daima yeşildir.
- Eklemler ve Eklem Bağları bağımsız çalışır. Açık katmanın düğmesinde kaynak yeşil çerçeve gösterilir; kapalı katmanda normal düğme kullanılır.
- Bir katman açılınca kendi kaynak bilgi kartı gelir. Kameranın konumu değişmez; aynı bölgenin katmanlı ve katmansız görünümü karşılaştırılabilir.
- Modelde bir kemiğe dokununca o kemiğin kartı açılır, kamera kemiğe odaklanır ve kemik hafif bir vurguyla ayrışır. Diğer katmanların görünürlük durumları korunur.
- Açık bir katmanın düğmesine başka bir karttayken basmak, o katmanın kartını geri getirir. Kendi kartı açıkken düğmeye tekrar basmak katmanı kapatır.
- Alttaki Görünüm düğmesi ön, arka, sol ve sağ kamera açılarını açar. Döndür, Etiketler ve Tümünü göster araçları aynı alt sıradadır.
- Tümünü göster üç katmanı açar. Sağ üstteki sıfırlama düğmesi başlangıç durumuna döner; döndürmeyi ve etiketleri de kapatır.
- Fareyle / tek parmakla sürükleyerek döndürün; tekerlek / iki parmakla yakınlaştırın. Sağ tıkla modeli taşıyabilirsiniz.
- `R` başlangıca döner; `1`–`4` kamera açısını, sol/sağ ok tuşları kemik kartını değiştirir. `Escape` açık araç menülerini kapatır.

## Video incelemesine göre düzenlemeler

`Destek Ve Sinir.mp4` dosyasının 00:00–13:06 bölümü esas alınmıştır.

- **07:18–08:38:** Sol alttaki kemik listesi kaldırıldı. Üç kaynak düğmesi referans tasarımdaki gibi dikey ortalandı. Kemikler sabit tutuldu; eklem ve bağ katmanları bağımsız açma/kapama davranışına geçirildi. Kırmızı düğme kullanılmaz.
- **09:08–09:36:** `kullan-at/kartlar` içindeki Eklemler ve Eklem Bağı görselleri uygulamanın kaynaklarına alındı. Katman kartından kemik kartına ve tekrar katman kartına dönüş sağlandı.
- **09:46–10:14:** Masaüstü için 2048 piksel doku sürümü üretildi; aşırı aydınlık görünüm azaltıldı ve doku örneklemesi iyileştirildi. Geometri, düğümler ve model grupları değiştirilmedi.
- **10:14–12:54:** İzole et, üst başlık ve Bir yapı seçin satırı kaldırıldı. Kamera açılarının üst şeridi, alttaki Görünüm düğmesinden açılan bir menüye dönüştürüldü. Döndür, Etiketler ve Tümünü göster korundu.

Model masaüstünde ve telefonda tüm ekran boyunca çizilir; yakınlaştırıldığında orta sütunun sınırlarında kesilmez. Düğmeler ve kaydırılabilir bilgi kartı modelin üzerinde kalır. Kontroller arasındaki boş alanlardan modeli döndürmeye ve yakınlaştırmaya devam edebilirsiniz.

## Model dosyaları

- `destek-detail.glb`: masaüstü için en fazla **2048 piksel** dokular, **62,1 MiB**.
- `destek-web.glb`: telefon, dokunmatik cihaz veya 900 piksel ve altı ekranla açılış için mevcut **1024 piksel** dokular, **13,5 MiB**.
- `destek-lossless.glb`: yerel, tam çözünürlüklü kaynak kopyası. Uygulamaya veya Git deposuna dahil edilmez.

Masaüstü sürümü 1024 piksele göre daha ayrıntılıdır; özgün 4K dokuların tam çözünürlüğünde değildir. Doku küçültme sonrasında WebP paketlemesi kayıpsızdır. 144 geometri tamponu kaynakla bayt düzeyinde aynı kalmıştır. `EXT_texture_webp` desteği Three.js yükleyicisinde bulunur.

Masaüstü modelini Pillow kurulu Python ile yeniden üretmek için:

```bash
python optimize_model.py --size 2048 --target destek-detail.glb
```

Betik varsa `kaynak/destek.glb` dosyasını, yoksa yerel `destek-lossless.glb` kopyasını okur. Farklı bir kaynak `--source` ile belirtilebilir. `kullan-at/` içindeki büyük FBX/PSD çalışma kaynakları yerelde tutulur; uygulama yalnızca `kaynak/` içine alınan gerekli görselleri kullanır.
