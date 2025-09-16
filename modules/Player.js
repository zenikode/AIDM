export class Player {
  constructor() {
    this.name = 'Герой';
    this.hp = null;
    this.mp = null;
    this.str = 10;
    this.dex = 10;
    this.con = 10;
    this.int = 10;
    this.wis = 10;
    this.cha = 10;
    this.inventory = [];
    this.abilities = [];
    this.gold = 0;
  }

  // Обновление данных игрока
  update(data = {}) {
    Object.assign(this, data);
    return this;
  }

  // Получение модификатора характеристики
  getModifier(stat) {
    const value = this[stat] || 10;
    return Math.floor((value - 10) / 2);
  }

  // Получение общего значения характеристики
  getTotalStat(stat) {
    const base = this[stat] || 10;
    return base + this.getModifier(stat);
  }

  // Добавление предмета в инвентарь
  addItem(item) {
    this.inventory.push(item);
  }

  // Удаление предмета из инвентаря
  removeItem(itemName) {
    this.inventory = this.inventory.filter(item => item.name !== itemName);
  }

  // Добавление способности
  addAbility(ability) {
    this.abilities.push(ability);
  }

  // Удаление способности
  removeAbility(abilityName) {
    this.abilities = this.abilities.filter(ab => ab.name !== abilityName);
  }

  // Изменение HP
  changeHP(amount) {
    this.hp = Math.max(0, (this.hp || 0) + amount);
    return this.hp;
  }

  // Изменение MP
  changeMP(amount) {
    this.mp = Math.max(0, (this.mp || 0) + amount);
    return this.mp;
  }

  // Изменение золота
  changeGold(amount) {
    this.gold = Math.max(0, (this.gold || 0) + amount);
    return this.gold;
  }

  // Проверка жив ли игрок
  isAlive() {
    return (this.hp || 0) > 0;
  }

  // Получение данных для сериализации
  toJSON() {
    return {
      name: this.name,
      hp: this.hp,
      mp: this.mp,
      str: this.str,
      dex: this.dex,
      con: this.con,
      int: this.int,
      wis: this.wis,
      cha: this.cha,
      inventory: this.inventory,
      abilities: this.abilities,
      gold: this.gold
    };
  }
}
