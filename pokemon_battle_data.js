// ===================== 배틀: 타입 상성표 =====================
// 원본 팬게임(Pokemon Essentials 기반)의 types.dat에서 뽑은 실제 상성 데이터 — 데미지 배율은 이것만으로 계산

// TYPE_CHART[방어측 타입] = { weak: 이 타입이 2배로 맞는 공격 타입들,
//                              resist: 0.5배로 맞는 공격 타입들,
//                              immune: 0배(무효)인 공격 타입들 }
const TYPE_CHART = {
    NORMAL:   { weak: ["FIGHTING"], resist: [], immune: ["GHOST"] },
    FIGHTING: { weak: ["FLYING", "PSYCHIC", "FAIRY"], resist: ["ROCK", "BUG", "DARK"], immune: [] },
    FLYING:   { weak: ["ROCK", "ELECTRIC", "ICE"], resist: ["FIGHTING", "BUG", "GRASS"], immune: ["GROUND"] },
    POISON:   { weak: ["GROUND", "PSYCHIC"], resist: ["FIGHTING", "POISON", "BUG", "GRASS", "FAIRY"], immune: [] },
    GROUND:   { weak: ["WATER", "GRASS", "ICE"], resist: ["POISON", "ROCK"], immune: ["ELECTRIC"] },
    ROCK:     { weak: ["FIGHTING", "GROUND", "STEEL", "WATER", "GRASS"], resist: ["NORMAL", "FLYING", "POISON", "FIRE"], immune: [] },
    BUG:      { weak: ["FLYING", "ROCK", "FIRE"], resist: ["FIGHTING", "GROUND", "GRASS"], immune: [] },
    GHOST:    { weak: ["GHOST", "DARK"], resist: ["POISON", "BUG"], immune: ["NORMAL", "FIGHTING"] },
    STEEL:    { weak: ["FIGHTING", "GROUND", "FIRE"], resist: ["NORMAL", "FLYING", "ROCK", "BUG", "STEEL", "GRASS", "PSYCHIC", "ICE", "DRAGON", "FAIRY"], immune: ["POISON"] },
    QMARKS:   { weak: [], resist: [], immune: [] },
    FIRE:     { weak: ["GROUND", "ROCK", "WATER"], resist: ["BUG", "STEEL", "FIRE", "GRASS", "ICE", "FAIRY"], immune: [] },
    WATER:    { weak: ["GRASS", "ELECTRIC"], resist: ["STEEL", "FIRE", "WATER", "ICE"], immune: [] },
    GRASS:    { weak: ["FLYING", "POISON", "BUG", "FIRE", "ICE"], resist: ["GROUND", "WATER", "GRASS", "ELECTRIC"], immune: [] },
    ELECTRIC: { weak: ["GROUND"], resist: ["FLYING", "STEEL", "ELECTRIC"], immune: [] },
    PSYCHIC:  { weak: ["BUG", "GHOST", "DARK"], resist: ["FIGHTING", "PSYCHIC"], immune: [] },
    ICE:      { weak: ["FIGHTING", "ROCK", "STEEL", "FIRE"], resist: ["ICE"], immune: [] },
    DRAGON:   { weak: ["ICE", "DRAGON", "FAIRY"], resist: ["FIRE", "WATER", "GRASS", "ELECTRIC"], immune: [] },
    DARK:     { weak: ["FIGHTING", "BUG", "FAIRY"], resist: ["GHOST", "DARK"], immune: ["PSYCHIC"] },
    FAIRY:    { weak: ["POISON", "STEEL"], resist: ["FIGHTING", "BUG", "DARK"], immune: ["DRAGON"] },
    STELLAR:  { weak: [], resist: [], immune: [] }
};
