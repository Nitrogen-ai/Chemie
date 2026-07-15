#let LOESUNG = false
// ===================================================================
//  Lernpfad III – Organische Chemie · Mitschrift / Musterlösung
//  Eine Quelle, LOESUNG-Flag schaltet zwischen Lücken- und Lösungsfassung.
//  Strukturformeln: identischer Renderer wie der Kommunikationstrainer.
// ===================================================================

#let acc   = rgb("#a83610")
#let tealc = rgb("#1e5d52")
#let inkc  = rgb("#1c1712")
#let paper = rgb("#f7eede")

#set text(font: "New Computer Modern", size: 10.5pt, lang: "de")
#set par(justify: true, leading: 0.62em)
#set page(
  paper: "a4",
  margin: (x: 2cm, top: 2.4cm, bottom: 2cm),
  header: context {
    set text(size: 8pt, fill: luma(110))
    grid(columns: (1fr, auto),
      [Chemie · Leistungskurs · Q1 — Lernpfad III],
      [#if LOESUNG [*Musterlösung*] else [Mitschrift]]
    )
    line(length: 100%, stroke: 0.4pt + luma(180))
  },
  footer: context {
    set text(size: 8pt, fill: luma(120))
    line(length: 100%, stroke: 0.4pt + luma(180))
    grid(columns: (1fr, auto),
      [Organische Chemie · funktionelle Gruppen · zwischenmolekulare Kräfte],
      [Seite #counter(page).display() / #context counter(page).final().first()]
    )
  }
)

#show heading.where(level: 1): it => block(below: 0.8em, above: 0.4em)[
  #set text(size: 16pt, weight: "bold", fill: inkc)
  #it.body
]
#show heading.where(level: 2): it => block(above: 1.1em, below: 0.6em)[
  #set text(size: 11.5pt, weight: "bold", fill: tealc)
  #box(inset: (right: 6pt))[#text(fill: acc)[§]] #it.body
  #v(-4pt)
  #line(length: 100%, stroke: 0.5pt + luma(200))
]
#show heading.where(level: 3): it => block(above: 0.7em, below: 0.3em)[
  #set text(size: 10.5pt, weight: "bold", fill: inkc)
  #it.body
]

// ---- Hilfsfunktionen: Lücke vs. Lösung -----------------------------
#let SOL = LOESUNG
// Inline-Lücke
#let gi(a, w: 3.2cm) = if SOL { text(fill: acc, weight: "bold")[#a] } else { box(width: w, baseline: 2pt, stroke: (bottom: 0.6pt + luma(150)))[#h(0pt)] }
// Block-Antwort (Lösung getönt / sonst Schreiblinien)
#let blk(a, lines: 3) = if SOL {
  block(fill: paper, inset: 8pt, radius: 4pt, width: 100%, stroke: 0.5pt + rgb("#e3d6bf"))[#set text(fill: rgb("#5a2a0c")); #a]
} else {
  block(width: 100%, inset: (y: 3pt))[#for i in range(lines) { v(1.4em); line(length: 100%, stroke: 0.4pt + luma(175)) }]
}
// Tabellenzelle: Lösung füllt, Mitschrift leer mit Höhe
#let tc(a) = if SOL { text(fill: acc, size: 8.6pt)[#a] } else { box(height: 1.5em)[] }
// Molekül-Abbildung mit Bildunterschrift
#let mol(path, cap, w: 2.5cm) = align(center, box(width: w + 0.4cm)[
  #image(path, width: w)
  #v(-3pt)
  #text(size: 7pt, fill: luma(110))[#cap]
])
#let fig(path, cap, w: 11cm) = figure(image(path, width: w), caption: text(size: 8pt)[#cap])
#show figure.caption: set text(size: 8pt, fill: luma(110))

// ===================================================================
//  TITEL
// ===================================================================
#block(width: 100%, inset: (y: 6pt))[
  #text(size: 9pt, fill: acc, weight: "bold", tracking: 2pt)[LERNPFAD III · Q1]
  #v(2pt)
  #text(size: 22pt, weight: "bold", fill: inkc)[Organische Chemie]
  #v(-2pt)
  #text(size: 12pt, style: "italic", fill: tealc)[Stoffklassen, funktionelle Gruppen & zwischenmolekulare Kräfte]
  #v(4pt)
  #if LOESUNG [
    #box(fill: tealc, inset: (x: 8pt, y: 3pt), radius: 4pt)[#text(fill: white, size: 9pt, weight: "bold")[MUSTERLÖSUNG]]
  ] else [
    #grid(columns: (1fr, 1fr), gutter: 10pt,
      [Name: #box(width: 1fr, stroke: (bottom: 0.6pt + luma(150)))[#h(0pt)]],
      [Datum: #box(width: 1fr, stroke: (bottom: 0.6pt + luma(150)))[#h(0pt)]]
    )
  ]
]
#line(length: 100%, stroke: 1pt + inkc)
#v(4pt)

#text(fill: tealc, style: "italic")[Basiskonzept: *Struktur & Eigenschaft* — aus dem Bau eines Moleküls und seinen zwischenmolekularen Kräften folgen die Stoffeigenschaften; und umgekehrt.]

// ===================================================================
= Einstieg: Struktur–Eigenschafts–Konzept an Zuckern
// ===================================================================

Die funktionelle Gruppe der Alkohole ist die *Hydroxylgruppe* #gi([–OH], w: 1.6cm). Glucose und Fructose (beide #raw("C6H12O6")) tragen je #gi([5], w: 0.8cm) solcher Gruppen.

#grid(columns: (1fr, 1fr), gutter: 12pt,
  [
    === Beobachtung 1 — Wasserlöslichkeit
    Beide Zucker sind #gi([sehr gut wasserlöslich]).
    #v(2pt)
    Werte (25 °C): Glucose $approx$ #gi([910 g/L], w: 2cm), Fructose $approx$ #gi([4000 g/L], w: 2cm).
  ],
  [
    === Beobachtung 2 — Geschmack
    Beide Zucker schmecken #gi([süß], w: 1.4cm).
    #v(2pt)
    Erkennung am Süßrezeptor nach dem #gi([Schlüssel-Schloss-Prinzip], w: 4.2cm).
  ]
)

#v(4pt)
*Begründung (Teilchenebene).*
#blk([
  Jede –OH-Gruppe ist stark polar (δ− am O, δ+ am H). Zu den Wassermolekülen bilden sich starke *Dipol-Dipol-Wechselwirkungen*, im Fall O–H···O *Wasserstoffbrücken* → gute Löslichkeit. Je *mehr* –OH-Gruppen, desto mehr Brücken zum Lösungsmittel, desto besser löslich. Die räumliche –OH-Anordnung passt an die Bindungstasche des *Süßrezeptors* → Signal „süß“.
], lines: 4)

=== Umkehrung (deduktiv): Disaccharide
Maltose und Saccharose (#raw("C12H22O11")) sind ebenfalls sehr gut löslich und süß. Grund: je #gi([8], w: 0.8cm) freie –OH-Gruppen pro Molekül.
*Fazit:* Nicht die Summenformel, sondern die #gi([funktionelle Gruppe], w: 4cm) und die daraus folgenden #gi([zwischenmolekularen Kräfte], w: 5cm) bestimmen die Eigenschaften.

// ===================================================================
= Zwischenmolekulare Kräfte & Symbolik der Partialladungen
// ===================================================================

#fig("svg/fig_partialladung.svg", [Polare Bindung mit δ-Ladungen und Dipolmoment · Wasserstoffbrücke O–H···O], w: 14cm)

#grid(columns: (1fr, 1fr), gutter: 12pt,
  fig("svg/fig_oh_solvatation.svg", [–OH-Gruppe in Wasser (Solvatation)], w: 6.6cm),
  fig("svg/fig_schluessel_schloss.svg", [Schlüssel-Schloss-Prinzip am Süßrezeptor], w: 6.6cm),
)

#v(2pt)
*Merksatz.* Gleiches löst sich in Gleichem: polare/H-Brücken-fähige Gruppen (–OH, –COOH, C=O) → #gi([hydrophil], w: 2.4cm); lange C–H-Ketten → #gi([hydrophob], w: 2.4cm).

#pagebreak()

// ===================================================================
= Übersicht der Stoffklassen (Auftrag)
// ===================================================================
Trage zu jeder Stoffklasse die typischen Eigenschaften und ihren zwischenmolekularen Grund ein (Stichworte, keine ganzen Sätze).

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt,
  align: (left + top, left + top, left + top),
  stroke: 0.5pt + luma(200),
  fill: (_, row) => if row == 0 { tealc } else { none },
  table.header(
    text(fill: white, weight: "bold", size: 8.5pt)[Stoffklasse],
    text(fill: white, weight: "bold", size: 8.5pt)[Funkt. Gruppe],
    text(fill: white, weight: "bold", size: 8.5pt)[Eigenschaften ⟸ Struktur / zwischenmolek. Kräfte],
  ),
  [Alkane], [keine], tc[unpolar; nur Van-der-Waals; Sdp. ↑ mit Kettenlänge; wasserunlöslich, fettlöslich],
  [verzw. Alkane], [keine], tc[Isomere; Verzweigung → kleinere Kontaktfläche → niedrigerer Sdp. als unverzweigt],
  [Alkene], [C=C], tc[π-Bindung reaktiv (Addition, Polymerisation, Bromwasser); konjugiert → UV/Vis → Farbe; antioxidativ],
  [verzw. Alkene], [C=C], tc[wie Alkene; höher substituierte C=C stabiler; Verzweigung ↓ Sdp.],
  [Alkine], [C≡C], tc[sehr energiereich; endständig acides ≡C–H (Kettenverlängerung); additionsfreudig],
  [verzw. Alkine], [C≡C], tc[wie Alkine; Lage der Dreifachbindung & Verzweigung bestimmen Reaktivität/Sdp.],
  [Alkanole], [–OH], tc[H-Brücken → hoher Sdp.; kurz = wasserlöslich, lang = unlöslich; oxidierbar; bilden Ester],
  [Alkanale], [–CHO], tc[polare C=O, keine eigenen H-Brücken → Sdp. zw. Alkan & Alkohol; leicht oxidierbar (Fehling/Tollens +)],
  [Alkanone], [C=O], tc[polar, Dipol-Dipol; kurze gut wasserlöslich; nicht leicht oxidierbar → Unterschied zu Aldehyden],
  [Alkansäuren], [–COOH], tc[sauer (H⁺-Abgabe, stabilisiertes Anion); sehr starke H-Brücken/Dimere → hoher Sdp.],
  [Ester], [–CO–O–], tc[kein O–H → keine H-Brücken-Donoren → flüchtig, schlechter wasserlöslich, fruchtiger Geruch],
)

== Vorlage: Stoffklasse Alkanole
#grid(columns: (auto, 1fr), gutter: 14pt, align: (center + horizon, left + top),
  [
    #image("svg/ethanol_full.svg", width: 3cm)
    #text(size: 7pt, fill: luma(110))[Ethanol · #raw("C2H6O")]
    #v(4pt)
    #image("svg/butan1ol_skeletal.svg", width: 3cm)
    #text(size: 7pt, fill: luma(110))[Butan-1-ol · Skelettformel]
  ],
  [
    - *Funktionelle Gruppe:* Hydroxylgruppe –OH (R–OH).
    - *Löslichkeit:* kurze Alkanole wasserlöslich (H-Brücken); mit längerer Kette ↓.
    - *Siedetemperatur:* hoch ggü. Alkanen → H-Brücken zwischen den Molekülen.
    - *Reaktivität:* oxidierbar (→ Aldehyd/Keton → Säure); bilden Ester.
    - *Polarität:* δ− am O, δ+ am H → hydrophiler Kopf, hydrophober C-Schwanz.
  ]
)

== Kernaussagen Fachtext — Alkene (nicht alltagsbekannt)
#blk([
  *Reaktivität:* elektronenreiche π-Bindung → Additionen (Bromwasser entfärbt sich), Polymerisation (Polyethen, Polypropen). *Antioxidativ / Autoxidation:* Doppelbindungen fangen Radikale ab (Antioxidantien) bzw. werden angegriffen (Ranzigwerden). *UV/Vis & Farbe:* viele *konjugierte* Doppelbindungen → Absorption rückt vom UV ins Sichtbare → farbig (β-Carotin orange, Lycopin rot); je länger das konjugierte System, desto langwelliger.
], lines: 4)

#pagebreak()

// ===================================================================
= Übungsaufgaben — Reproduktion · Anwendung · Transfer
// ===================================================================

== A1 (Reproduktion) — Stoffklasse erkennen
Bestimme je: Stoffklasse, funktionelle Gruppe, Summenformel.
#grid(columns: 4, gutter: 6pt,
  mol("svg/pentan1ol_skeletal.svg", [(a) Skelettf.]),
  mol("svg/propanal_full.svg", [(b) Strukturf.]),
  mol("svg/but1en_skeletal.svg", [(c) Skelettf.]),
  mol("svg/essigsaeure_full.svg", [(d) Strukturf.]),
)
#blk([
  (a) *Alkanol*, –OH; Pentan-1-ol, #raw("C5H12O"). #h(8pt) (b) *Alkanal*, –CHO; Propanal, #raw("C3H6O"). #linebreak()
  (c) *Alken*, C=C; But-1-en, #raw("C4H8"). #h(8pt) (d) *Alkansäure*, –COOH; Ethansäure (Essigsäure), #raw("C2H4O2").
], lines: 3)

== A2 (Anwendung) — Siedetemperatur
Ethanol ist flüssig, Butan gasförmig (ähnliche molare Masse). Erkläre auf Teilchenebene.
#grid(columns: 2, gutter: 10pt, column-gutter: 30pt,
  mol("svg/ethanol_full.svg", [Ethanol]),
  mol("svg/butan_full.svg", [Butan]),
)
#blk([
  Ethanol bildet über die –OH-Gruppe *Wasserstoffbrücken* (beim Sieden zu überwinden) → höhere Siedetemperatur, flüssig. Butan ist unpolar → nur *Van-der-Waals-Kräfte* → niedrige Siedetemperatur, gasförmig.
], lines: 3)

== A3 (Anwendung) — Wasserlöslichkeit ordnen
Ordne Hexan und Hexan-1-ol nach steigender Wasserlöslichkeit; vergleiche mit Ethanol.
#grid(columns: 2, gutter: 10pt, column-gutter: 30pt,
  mol("svg/hexan_skeletal.svg", [Hexan]),
  mol("svg/hexan1ol_skeletal.svg", [Hexan-1-ol]),
)
#blk([
  Hexan < Hexan-1-ol. Hexan unpolar (unlöslich); Hexan-1-ol hat einen polaren –OH-Kopf (H-Brücken), aber lange unpolare Kette → mäßig löslich. Ethanol: gleicher Kopf, kurze Kette → hydrophiler Anteil überwiegt → mit Wasser mischbar.
], lines: 3)

== A4 (Transfer) — Ester vs. Säure
Essigsäure und Ethylacetat (ähnliche Masse): warum riecht der Ester stärker / ist flüchtiger?
#grid(columns: 2, gutter: 10pt, column-gutter: 30pt,
  mol("svg/essigsaeure_skeletal.svg", [Essigsäure]),
  mol("svg/ethylacetat_skeletal.svg", [Ethylacetat]),
)
#blk([
  Die Säure besitzt O–H → starke Wasserstoffbrücken (Dimere) → schwer flüchtig. Im Ester ist das O–H verschwunden (–CO–O–) → *keine H-Brücken-Donoren* → nur Dipol-Dipol → flüchtiger, intensiver Geruch, schlechter wasserlöslich.
], lines: 3)

== A5 (Transfer) — Konjugation & Farbe (β-Carotin)
Warum ist ein konjugiertes Doppelbindungssystem farbig, ein einzelnes Alken nicht?
#fig("svg/polyene.svg", [Ausschnitt eines konjugierten Polyensystems], w: 11cm)
#blk([
  Im konjugierten System sind die π-Elektronen *delokalisiert* → kleinerer Energieabstand für die Anregung → Absorption verschiebt sich vom UV ins *Sichtbare*. β-Carotin absorbiert blau → wir sehen die Komplementärfarbe *orange*. Je länger das konjugierte System, desto langwelliger.
], lines: 3)

// ===================================================================
= Schnellläufer:innen — Aromaten
// ===================================================================
#fig("svg/aromaten.svg", [Benzol · Naphthalin · Anthracen — kondensierte Aromaten], w: 11cm)
#blk([
  *Stabilität:* 6 π-Elektronen ringförmig *delokalisiert* (Aromatizität) → sehr stabil → *Substitution* statt Addition. *Cancerogenität:* große, flache PAK schieben sich zwischen die DNA-Basenpaare (*Interkalation*) → Mutationen/Krebs. *Namensherkunft:* viele erste Vertreter rochen angenehm *aromatisch* (Harze/Balsame) — der Name beschreibt den Geruch, nicht die Reaktivität.
], lines: 4)
