// Boshlang'ich katalog. Janr identifikatorlari va tmdb_id TMDB bilan mos.
// Reyting, poster va treyler ataylab berilmagan: ular TMDB kaliti qo'shilganda
// haqiqiy manbadan to'ldiriladi (src/lib/movies/sync.ts).

export const genres = [
  [28, "jangari", "Jangari", "Action"],
  [12, "sarguzasht", "Sarguzasht", "Adventure"],
  [16, "animatsiya", "Animatsiya", "Animation"],
  [35, "komediya", "Komediya", "Comedy"],
  [80, "kriminal", "Kriminal", "Crime"],
  [99, "hujjatli", "Hujjatli", "Documentary"],
  [18, "drama", "Drama", "Drama"],
  [10751, "oilaviy", "Oilaviy", "Family"],
  [14, "fantaziya", "Fantaziya", "Fantasy"],
  [36, "tarixiy", "Tarixiy", "History"],
  [27, "qorqinchli", "Qo'rqinchli", "Horror"],
  [10402, "musiqiy", "Musiqiy", "Music"],
  [9648, "sirli", "Sirli", "Mystery"],
  [10749, "romantik", "Romantik", "Romance"],
  [878, "ilmiy-fantastika", "Ilmiy fantastika", "Science Fiction"],
  [10770, "tv-film", "TV film", "TV Movie"],
  [53, "triller", "Triller", "Thriller"],
  [10752, "urush", "Urush", "War"],
  [37, "vestern", "Vestern", "Western"],
];

export const movies = [
  {
    tmdb_id: 278, title: "The Shawshank Redemption", title_uz: "Shoushenkdan qochish",
    year: 1994, runtime: 142, director: "Frank Darabont", lang: "en", genres: [18, 80],
    overview_uz: "Xotini va uning oshig'ini o'ldirganlikda nohaq ayblangan bankir Endi Dyufreyn Shoushenk qamoqxonasiga tushadi. U yillar davomida umidini yo'qotmay, do'sti Red bilan birga erkinlikka yo'l izlaydi.",
  },
  {
    tmdb_id: 238, title: "The Godfather", title_uz: "Cho'qintirgan ota",
    year: 1972, runtime: 175, director: "Francis Ford Coppola", lang: "en", genres: [18, 80],
    overview_uz: "Korleone mafiya oilasining keksa boshlig'i Vito hokimiyatni istamagan holda o'g'li Maykl qo'liga topshiradi. Oila sha'nini himoya qilish Maykl uchun shafqatsiz yo'lga aylanadi.",
  },
  {
    tmdb_id: 155, title: "The Dark Knight", title_uz: "Qorong'u ritsar",
    year: 2008, runtime: 152, director: "Christopher Nolan", lang: "en", genres: [18, 28, 80, 53],
    overview_uz: "Betmen, leytenant Gordon va prokuror Xarvi Dent Gotemdagi uyushgan jinoyatchilikka qarshi kurashadi. Ammo shaharni tartibsizlikka cho'mdirmoqchi bo'lgan Joker ularning har birini sinovdan o'tkazadi.",
  },
  {
    tmdb_id: 27205, title: "Inception", title_uz: "Boshlanish",
    year: 2010, runtime: 148, director: "Christopher Nolan", lang: "en", genres: [28, 878, 12],
    overview_uz: "Dom Kobb odamlarning tushiga kirib, sirlarni o'g'irlaydi. Unga teskari vazifa beriladi: kimningdir ongiga g'oyani joylashtirish. Bu ish uchun u tush ichidagi tushlarning chuqur qatlamlariga tushishi kerak.",
  },
  {
    tmdb_id: 157336, title: "Interstellar", title_uz: "Yulduzlararo",
    year: 2014, runtime: 169, director: "Christopher Nolan", lang: "en", genres: [12, 18, 878],
    overview_uz: "Yer insoniyat uchun yashashga yaroqsiz bo'lib bormoqda. Sobiq uchuvchi Kuper bir guruh olimlar bilan chuvalchang teshigi orqali yangi uy izlab, boshqa galaktikaga yo'l oladi.",
  },
  {
    tmdb_id: 603, title: "The Matrix", title_uz: "Matritsa",
    year: 1999, runtime: 136, director: "Lana Wachowski, Lilly Wachowski", lang: "en", genres: [28, 878],
    overview_uz: "Xaker Neo atrofidagi dunyo mashinalar yaratgan simulyatsiya ekanini bilib qoladi. Morfeus va Triniti bilan birga u insoniyatni ozod qilish uchun kurashga qo'shiladi.",
  },
  {
    tmdb_id: 13, title: "Forrest Gump", title_uz: "Forrest Gamp",
    year: 1994, runtime: 142, director: "Robert Zemeckis", lang: "en", genres: [35, 18, 10749],
    overview_uz: "Sodda qalbli Forrest Gamp o'z hayot yo'li davomida Amerika tarixining muhim voqealariga beixtiyor guvoh va ishtirokchi bo'ladi, lekin yuragi doim bolalikdagi do'sti Jenni bilan qoladi.",
  },
  {
    tmdb_id: 680, title: "Pulp Fiction", title_uz: "Arzon fantastika",
    year: 1994, runtime: 154, director: "Quentin Tarantino", lang: "en", genres: [53, 80],
    overview_uz: "Ikki qotil, bokschi, gangster xotini va bir juft talonchining hikoyalari Los-Anjelesda kutilmagan tarzda bir-biriga chirmashib ketadi.",
  },
  {
    tmdb_id: 496243, title: "Parasite", title_uz: "Parazit", original_title: "기생충",
    year: 2019, runtime: 132, director: "Bong Joon-ho", lang: "ko", genres: [35, 53, 18],
    overview_uz: "Kambag'al Kim oilasi a'zolari birin-ketin boy Pak oilasiga xizmatga joylashib oladi. Ammo hashamatli uyda ular kutmagan sir yashiringan bo'lib chiqadi.",
  },
  {
    tmdb_id: 129, title: "Spirited Away", title_uz: "Ruhlar olib ketgan qiz", original_title: "千と千尋の神隠し",
    year: 2001, runtime: 125, director: "Hayao Miyazaki", lang: "ja", genres: [16, 10751, 14],
    overview_uz: "O'n yoshli Chixiro ota-onasi bilan ruhlar dunyosiga adashib kirib qoladi. Ota-onasini qutqarish uchun u jodugar Yubabaning hammomida ishlashga majbur bo'ladi.",
  },
  {
    tmdb_id: 8587, title: "The Lion King", title_uz: "Sher qirol",
    year: 1994, runtime: 88, director: "Roger Allers, Rob Minkoff", lang: "en", genres: [10751, 16, 18],
    overview_uz: "Yosh sher Simba otasi Mufasaning o'limidan so'ng o'z yurtidan qochadi. Ulg'aygach, u amakisi Skardan taxtni qaytarib olish uchun qaytishi kerak.",
  },
  {
    tmdb_id: 98, title: "Gladiator", title_uz: "Gladiator",
    year: 2000, runtime: 155, director: "Ridley Scott", lang: "en", genres: [28, 18, 12],
    overview_uz: "Rim generali Maksimus imperator Kommod xiyonati tufayli oilasidan ayriladi va qulga aylanadi. U gladiator sifatida arenada g'olib chiqib, qasos olish yo'lini izlaydi.",
  },
  {
    tmdb_id: 597, title: "Titanic", title_uz: "Titanik",
    year: 1997, runtime: 194, director: "James Cameron", lang: "en", genres: [18, 10749],
    overview_uz: "Kambag'al rassom Jek va zodagon oiladan chiqqan Rouz mashhur \"Titanik\" kemasida uchrashib, bir-birini sevib qoladi. Ularning muhabbati kemaning halokatli kechasida sinovdan o'tadi.",
  },
  {
    tmdb_id: 497, title: "The Green Mile", title_uz: "Yashil yo'lak",
    year: 1999, runtime: 189, director: "Frank Darabont", lang: "en", genres: [14, 18, 80],
    overview_uz: "O'lim jazosiga hukm qilinganlar bo'limi nazoratchisi Pol Edjkomb mahbuslardan biri, ulkan va yuvosh Jon Koffi g'ayritabiiy qobiliyatga ega ekanini anglaydi.",
  },
  {
    tmdb_id: 475557, title: "Joker", title_uz: "Joker",
    year: 2019, runtime: 122, director: "Todd Phillips", lang: "en", genres: [80, 53, 18],
    overview_uz: "Jamiyat chetga surib qo'ygan masxaraboz Artur Flek Gotem ko'chalarida asta-sekin aqldan ozib, mashhur jinoyatchi Jokerga aylanadi.",
  },
  {
    tmdb_id: 299534, title: "Avengers: Endgame", title_uz: "Qasoskorlar: Final",
    year: 2019, runtime: 181, director: "Anthony Russo, Joe Russo", lang: "en", genres: [12, 878, 28],
    overview_uz: "Tanos koinot aholisining yarmini yo'q qilganidan keyin omon qolgan qahramonlar bor narsani qaytarish uchun so'nggi va eng xavfli rejaga qo'l urishadi.",
  },
  {
    tmdb_id: 438631, title: "Dune", title_uz: "Dyuna",
    year: 2021, runtime: 155, director: "Denis Villeneuve", lang: "en", genres: [878, 12],
    overview_uz: "Yosh Pol Atreydes oilasi bilan koinotdagi eng qimmatbaho modda qazib olinadigan cho'l sayyora Arrakisga keladi. Xiyonat uni sayyoraning sirli xalqi fremenlar orasiga olib boradi.",
  },
  {
    tmdb_id: 872585, title: "Oppenheimer", title_uz: "Oppengeymer",
    year: 2023, runtime: 180, director: "Christopher Nolan", lang: "en", genres: [18, 36],
    overview_uz: "Fizik Robert Oppengeymer Manxetten loyihasiga rahbarlik qilib, birinchi atom bombasini yaratadi. Film ixtironing narxi va olimning keyingi taqdiri haqida.",
  },
  {
    tmdb_id: 354912, title: "Coco", title_uz: "Koko",
    year: 2017, runtime: 105, director: "Lee Unkrich", lang: "en", genres: [10751, 16, 14, 10402],
    overview_uz: "Musiqachi bo'lishni orzu qilgan meksikalik bola Migel O'liklar kunida ajdodlari yashaydigan rang-barang dunyoga tushib qoladi va oilasining unutilgan sirini ochadi.",
  },
  {
    tmdb_id: 862, title: "Toy Story", title_uz: "O'yinchoqlar tarixi",
    year: 1995, runtime: 81, director: "John Lasseter", lang: "en", genres: [16, 12, 10751, 35],
    overview_uz: "Kovboy qo'g'irchoq Vudi Endining sevimli o'yinchog'i edi, toki xonaga zamonaviy kosmonavt Baz Laytyer kelguncha. Raqobat ikkalasini katta sarguzashtga boshlaydi.",
  },
  {
    tmdb_id: 244786, title: "Whiplash", title_uz: "Qamchi zarbi",
    year: 2014, runtime: 106, director: "Damien Chazelle", lang: "en", genres: [18, 10402],
    overview_uz: "Yosh barabanchi Endryu nufuzli musiqa maktabida qattiqqo'l dirijyor Fletcher qo'liga tushadi. Mukammallikka intilish ikkalasini ham chegaradan chiqaradi.",
  },
  {
    tmdb_id: 313369, title: "La La Land", title_uz: "La La Lend",
    year: 2016, runtime: 128, director: "Damien Chazelle", lang: "en", genres: [35, 18, 10749, 10402],
    overview_uz: "Aktrisa bo'lishni istagan Mia va jaz pianinochisi Sebastyan Los-Anjelesda tanishib qolishadi. Orzular va muhabbat o'rtasida tanlov qilish vaqti keladi.",
  },
  {
    tmdb_id: 76341, title: "Mad Max: Fury Road", title_uz: "Telba Maks: G'azab yo'li",
    year: 2015, runtime: 120, director: "George Miller", lang: "en", genres: [28, 12, 878],
    overview_uz: "Postapokaliptik cho'lda Maks zolim Immortan Jodan qochayotgan imperator Furiosaga qo'shiladi. Butun film cho'l bo'ylab to'xtovsiz quvg'indan iborat.",
  },
  {
    tmdb_id: 807, title: "Se7en", title_uz: "Yetti",
    year: 1995, runtime: 127, director: "David Fincher", lang: "en", genres: [80, 9648, 53],
    overview_uz: "Nafaqaga chiqish arafasidagi detektiv Somerset va yosh hamkasbi Mills yetti o'lim gunohiga asoslangan qotilliklar zanjirini tergov qilishadi.",
  },
  {
    tmdb_id: 274, title: "The Silence of the Lambs", title_uz: "Qo'zilar sukunati",
    year: 1991, runtime: 118, director: "Jonathan Demme", lang: "en", genres: [80, 18, 53, 27],
    overview_uz: "FQB kursanti Klaris Starling ketma-ket qotilni topish uchun qamoqdagi daho psixiatr va odamxo'r Gannibal Lekterdan yordam so'rashga majbur bo'ladi.",
  },
  {
    tmdb_id: 419430, title: "Get Out", title_uz: "Ketib qol",
    year: 2017, runtime: 104, director: "Jordan Peele", lang: "en", genres: [9648, 53, 27],
    overview_uz: "Kris qiz do'sti Rouzning ota-onasi bilan tanishish uchun ularning shahar chetidagi uyiga boradi. Mehmondo'stlik ortida dahshatli niyat yashiringan bo'lib chiqadi.",
  },
  {
    tmdb_id: 120467, title: "The Grand Budapest Hotel", title_uz: "\"Grand Budapesht\" mehmonxonasi",
    year: 2014, runtime: 100, director: "Wes Anderson", lang: "en", genres: [35, 18],
    overview_uz: "Afsonaviy mehmonxona konserji Gustav va uning yosh yordamchisi Zero qimmatbaho rasm o'g'irlanishi va katta meros janjaliga aralashib qolishadi.",
  },
  {
    tmdb_id: 105, title: "Back to the Future", title_uz: "Kelajakka qaytish",
    year: 1985, runtime: 116, director: "Robert Zemeckis", lang: "en", genres: [12, 35, 878],
    overview_uz: "O'smir Marti Makflay olim do'sti Dokning vaqt mashinasida tasodifan 1955-yilga tushib qoladi. Endi u ota-onasining uchrashuvini ta'minlab, o'z davriga qaytishi kerak.",
  },
  {
    tmdb_id: 324857, title: "Spider-Man: Into the Spider-Verse", title_uz: "O'rgimchak-odam: Koinotlar bo'ylab",
    year: 2018, runtime: 117, director: "Bob Persichetti, Peter Ramsey, Rodney Rothman", lang: "en", genres: [28, 12, 16, 878],
    overview_uz: "Bruklinlik o'smir Mayls Morales O'rgimchak-odamga aylanadi va boshqa olamlardan kelgan o'rgimchak qahramonlar bilan birga koinotlarni qutqarishga kirishadi.",
  },
  {
    tmdb_id: 194, title: "Amélie", title_uz: "Ameli", original_title: "Le Fabuleux Destin d'Amélie Poulain",
    year: 2001, runtime: 122, director: "Jean-Pierre Jeunet", lang: "fr", genres: [35, 10749],
    overview_uz: "Parijlik ofitsiant qiz Ameli atrofidagi odamlarning hayotini yashirincha yaxshilashga qaror qiladi, lekin o'z baxti haqida o'ylashga jur'at etolmaydi.",
  },
];
