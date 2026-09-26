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

`kaynak/destek.glb` orijinal dosyadır (119,6 MiB). Aynı 4K doku piksellerini ve geometriyi koruyan `destek-lossless.glb` 89,7 MiB'dir. `optimize_lossless.py` ile yeniden üretilebilir. PNG dokuları kayıpsız WebP'ye dönüştürdüğü için `EXT_texture_webp` destekleyen bir glTF görüntüleyici gerektirir.

Uygulama, mobil belleği ve yükleme süresini azaltmak için dokuları 1024 piksele küçültülmüş `destek-web.glb` kopyasını kullanır (13,5 MiB). Bu sürüm orijinal 4K dokulara göre çözünürlük kaybeder; ancak son kayıpsız WebP paketleme adımı 1024 piksellik doku piksellerini değiştirmez. `optimize_model.py` ile yeniden üretilebilir. Her iki betik için de Pillow gerekir.
