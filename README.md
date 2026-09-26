# Destek ve Hareket Sistemi 3B

Sindirim Sistemi uygulamasındaki keşif mantığıyla hazırlanmış, tarayıcıda çalışan etkileşimli anatomi görüntüleyicisi.

## Çalıştırma

Bu klasörde bir yerel HTTP sunucusu başlatın:

```bash
python3 -m http.server 8000
```

Ardından `http://localhost:8000` adresini açın. Three.js modülleri CDN üzerinden yüklendiği için ilk açılışta internet bağlantısı gerekir.

## İçerik ve kullanım

- Kaynak GLB içindeki 19 kemik, eklemler ve eklem bağları doğrudan model parçalarıyla eşleştirilir.
- Kemik seçildiğinde ilgili kaynak bilgi kartı açılır ve kamera o yapıya yaklaşır. Modelin parçasına tıklamak da aynı seçimi yapar.
- Katmanlar tek tek gizlenebilir, seçili yapı izole edilebilir veya tümü tekrar gösterilebilir.
- Ön, arka, sol ve sağ kamera açıları; otomatik döndürme; etiketler; tam ekran ve sıfırlama bulunur.
- Sağ üstte kaynak buton görselleriyle sıfırlama, ses, menü, paylaşım ve tam ekran araçları yer alır. Menüden yapılar paneli ile kullanım yardımına erişilir.
- `R` görünümü sıfırlar, `1`–`4` kamera açısını değiştirir, sol/sağ ok seçili kemik kartları arasında geçer.

`kaynak/destek.glb` orijinal dosyadır. Uygulama, mobil belleği ve yükleme süresini azaltmak için dokuları 1024 piksele küçültülmüş `destek-web.glb` kopyasını kullanır. Kopya, `optimize_model.py` ile yeniden üretilebilir; bunun için Pillow gerekir.
