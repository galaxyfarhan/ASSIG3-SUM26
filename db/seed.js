// db/seed.js
// Returns the SQL that creates and populates the GreenThumb database.
//
// GreenThumb is a small community board where neighbours list houseplant
// cuttings they want to swap, and leave comments on each other's listings.
//
// NOTE ON PASSWORDS: they are stored in plaintext here ONLY so the SQL
// injection data-dump exercise has something dramatic to reveal. A real
// application must store a slow salted hash (bcrypt / argon2) and never the
// password itself. Password hashing is out of scope for Assignment 3 — do not
// "fix" it, it is intentional teaching scaffolding.

function buildSeed() {
  return `
    CREATE TABLE users (
      id       INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      bio      TEXT
    );

    CREATE TABLE listings (
      id          INTEGER PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      title       TEXT NOT NULL,
      species     TEXT NOT NULL,
      location    TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE comments (
      id         INTEGER PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      author     TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    INSERT INTO users (id, username, password, bio) VALUES
      (1, 'fern_hollow',  'sporeprint77',       'Ferns, mosses, and anything that likes shade.'),
      (2, 'cactus_carla', 'prickly-pear-2019',  'Desert succulents only. Trade at my own risk.'),
      (3, 'mossy_mo',     'terrarium4life',     'Building tiny worlds in glass jars.'),
      (4, 'curator',      'GreenThumb!Root#2024','Site curator. Do not share this account.');

    INSERT INTO listings (id, user_id, title, species, location, description, created_at) VALUES
      (1, 1, 'Split-leaf philodendron cutting', 'Monstera deliciosa', 'North Ward',
          'Rooted node with two healthy leaves. Looking to swap for a trailing pothos.', '2026-05-02 09:14'),
      (2, 2, 'Golden barrel cactus pup',        'Echinocactus grusonii','Old Mill',
          'Detached pup, callused and ready to pot. Prefers gritty soil.', '2026-05-03 16:40'),
      (3, 3, 'Java moss portion',               'Taxiphyllum barbieri', 'Riverside',
          'Palm-sized clump. Great for terrariums and shrimp tanks.', '2026-05-05 11:02'),
      (4, 1, 'Maidenhair fern division',        'Adiantum raddianum',   'North Ward',
          'A rooted division from my kitchen plant. Keep it humid.', '2026-05-06 08:20'),
      (5, 2, 'String of pearls strand',         'Curio rowleyanus',     'Old Mill',
          'Long strand, easy to propagate. Bright indirect light.', '2026-05-08 14:55'),
      (6, 3, 'Nerve plant cuttings (x3)',       'Fittonia albivenis',   'Riverside',
          'Three pink-veined cuttings. They faint dramatically when thirsty.', '2026-05-09 19:31');

    INSERT INTO comments (id, listing_id, author, body, created_at) VALUES
      (1, 1, 'mossy_mo',     'Still available? I have a marble queen pothos to trade.', '2026-05-02 10:05'),
      (2, 1, 'cactus_carla', 'Beautiful leaves on that one.',                          '2026-05-02 12:30'),
      (3, 3, 'fern_hollow',  'Java moss is the best. Grabbing some for my terrarium.',  '2026-05-05 13:12');
  `;
}

module.exports = { buildSeed };
