// ===================== 배틀: 타입 상성표 =====================
// another_red_aio(Pokemon Essentials 기반 팬게임)의 Data/types.dat를 Ruby Marshal로 파싱해
// 뽑아낸 실제 게임 데이터. 아직 능력치(공/방/특공/특방/스피드)를 안 쓰므로, 배틀 데미지 배율
// (0/0.25/0.5/1/2/4)은 이 상성표만으로 계산함. 공격 타입은 공격하는 포켓몬 자신의 타입을 그대로
// 쓰며, 기술은 공격/랭크업/회복 3종 중 하나를 고르는 단순 구조(공격은 명중률/치명타 적용).

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
