---
type: Research
title: The German classics in Davidis 1849
description: Where the 12 German classics stand in the German 4th edition of Davidis (Bielefeld 1849), the source that replaces the two Milwaukee editions (issue 33); the book's units, the licence of the Deutsches Textarchiv transcription, and the dishes the 1849 edition does not have. Nothing in the dish files is changed yet.
tags: [research, classics, sources, germany]
generated: { by: claude-code/2.1.326, at: 2026-11-22 }
sources:
  - '[^dta]: Henriette Davidis, Praktisches Kochbuch für die gewöhnliche und feinere Küche, 4th, enlarged and improved edition, Bielefeld: Velhagen und Klasing, 1849; transcription of the Deutsches Textarchiv, https://www.deutschestextarchiv.de/book/show/davidis_kochbuch_1849, read 2026-11-22'
  - '[^milwaukee]: the two editions used until now, see classic-dishes.md#germany'
---

# Why

The German classics follow Davidis, but both texts read so far were
printed in Milwaukee for German Americans[^milwaukee]: the English
edition of 1904 as the source and the German-language American edition
as the second check. Their measures are American, and where the
machine-read fraktur lost a fraction the dish has no amount. The owner
asked on 2026-11-22 why German dishes rest on American books; the
answer was blocked German hosts and fraktur. Issue 33 moves the German
classics to an edition printed in Germany.

# The source

Davidis 1849[^dta], the 4th edition, from the copy of the
Staatsbibliothek zu Berlin, transcribed and corrected by the Deutsches
Textarchiv (DTA). The 1879 DTA text (`davidis_kochbuch_1879`) is again
the Milwaukee edition (_für die Deutschen in Amerika_, Georg Brumder)
and does not help.

- **Fractions survive.** 1,525 lines carry ¼, ½, ¾, ⅛ or a written
  fraction; the "%" of the old scans does not occur.
- **Units of the book.** Pfund, Loth, Maß, Quart, Obertasse,
  Untertasse, Suppenteller, Eßlöffel, Theelöffel, "ein halbes Ei dick".
  The only definition in the book is in the table of contents: "1 Maß
  gleich 1 Quart" (line 172). Their size in grams and litres needs a
  source of its own for the Prussian units of 1849; none is read yet.
- **Licence.** The work is in the public domain (Davidis died 1876).
  The DTA transcription is CC BY-SA 4.0 (book page, "Verfügbarkeit",
  read 2026-11-22). Culina takes amounts as facts and writes the method
  in its own words, so no text of the transcription is copied; the
  source line still names the DTA as transcriber.
- **The file.** The plain text was handed over by the owner (the DTA's
  download needs a cookie set by script). It lives outside the
  repository at `/home/user/sources/davidis1849.txt`; line numbers
  below refer to it.
- **Hosts.** `deutschestextarchiv.de` and `www.deutschestextarchiv.de`
  are reachable since 2026-11-22.

# The 12 dishes

Chapter and number as printed; "line" is the heading in the text file.

| Dish file             | 1849 place                                    | line  | Fit                                                                                                         |
| --------------------- | --------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| eierkuchen            | G 55, Omelette (Eierkuchen)                   | 10795 | same dish; amounts by reference to G 52 (8 eggs, 1 Eßlöffel flour, ¼ Maß milk, 2 Eßlöffel milk per egg)     |
| rote-gruetze          | G 20, Rothe Grütze                            | 10313 | same dish (ground rice, red juice); the fresh-berry variant still to be checked                             |
| egg-noodles           | G 29, Sehr gute Nudeln (8–10 persons)         | 10447 | same dish; persons now stated by the source                                                                 |
| milchsuppe            | Soups IV 45, Milchsuppe                       | 5834  | same dish (Maß milk, starch, 2 yolks)                                                                       |
| potato-soup-fine      | Soups 24, Kartoffelsuppe                      | 5501  | nearest; the 1849 soup is cooked on meat or bones, no "very fine" variant                                   |
| kartoffelkloesse      | L 19, Kartoffelnklöße                         | 14745 | same dish (Suppenteller, Rührlöffel); L 15 and L 20 are other potato dumplings                              |
| holl-sauce            | Sauces 30, Holländische Sauce mit Wein        | 16291 | same dish; 4–5 yolks, Theelöffel flour, water and white wine                                                |
| napfkuchen            | Cakes 102, Feiner Rodon- oder Schneckenkuchen | 18294 | same dish (the 1904 title is "Rodon Kuchen"); amounts in Pfund, Loth and Maß with clear fractions           |
| frikandelle           | Meat 29, Gebratene Fricadelle                 | 12219 | same dish                                                                                                   |
| sauerbraten           | Meat 7, Sauerbraten                           | 11905 | by reference to Meat 6, Beef à la Mode (line 11871), 8 days in beer vinegar                                 |
| marinierte-heringe    | Fish 66, Marinirter Häring                    | 7254  | same dish                                                                                                   |
| baked-potatoes-cheese | not found                                     | —     | no baked potatoes with cheese among the potato dishes (lines 8532–8816) or the Aufläufe; to replace or drop |

Found by heading and first lines only; no dish has been read in full
against its file. Not checked: whether every ingredient line of the
current files appears in 1849.

# Next

Per dish: read the 1849 recipe in full, rewrite the amounts in the
book's units with `original` quoting the 1849 wording, fill the amounts
the Milwaukee texts lost, and have a second agent check each file
against the text ([reviews](../../../docs/reviews.md)). Before that, a
source for the 1849 units in metric.
