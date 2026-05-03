/**
 * BaseCommand - Tüm editör komutlarının temel sınıfı
 * Yeni komutlar bu sınıfı extend ederek oluşturulur.
 * 
 * @abstract
 */
export class BaseCommand {
  /**
   * @param {object} options
   * @param {string} options.name - Komutun benzersiz adı
   * @param {string} options.icon - Buton içinde gösterilecek HTML/metin
   * @param {string} options.title - Buton tooltip metni
   * @param {string|null} options.shortcut - Klavye kısayolu (ör: 'ctrl+b')
   * @param {string|null} options.tag - İlişkili HTML tag adı (aktif durum kontrolü için)
   */
  constructor({ name, icon, title, shortcut = null, tag = null }) {
    this.name = name;
    this.icon = icon;
    this.title = title;
    this.shortcut = shortcut;
    this.tag = tag;
  }

  /**
   * Komutu çalıştırır - alt sınıflar MUTLAKA override etmeli
   * @param {import('../editorCore.js').EditorCore} editor
   * @abstract
   */
  execute(editor) {
    throw new Error(`${this.name}: execute() metodu implement edilmeli`);
  }
}
