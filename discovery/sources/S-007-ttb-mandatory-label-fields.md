# External Source Notes: TTB Mandatory Label Fields (27 CFR Parts 4, 5, 7)

*Reviewed April 29, 2026. Sourced from Cornell LII mirror of the eCFR.*

These notes capture only the mandatory-label-field rules the prototype needs to ground REQ-004 (Layer 2 comparison against application data) and REQ-011 (Layer 1 well-formedness). They are not a complete model of TTB labeling law. They cover the three commodity classes the take-home prototype is most likely to see: wine, distilled spirits, malt beverages.

## Wine — 27 CFR 4.32 (Mandatory Label Information)

Wine container labels must show:

- Brand name (per § 4.33).
- Class, type, or other designation (per § 4.34).
- Name and address of the bottler/producer/importer (per § 4.35).
- Alcohol content (per § 4.36).
- Net contents (per § 4.37).

Foreign-blend disclosures, FD&C Yellow No. 5, cochineal/carmine, and sulfites have additional declaration rules; treat those as out of scope for this prototype.

Source: https://www.law.cornell.edu/cfr/text/27/4.32

### Wine Alcohol Content Format (27 CFR 4.36)

- Wines over 14% ABV must display alcohol content. Wines at or below 14% may use either an alcohol-content statement or a "table wine" / "light wine" class designation.
- Permitted format: "Alcohol __% by volume" or a substantively equivalent phrase. A range form is also permitted: "Alcohol __% to __% by volume."
- Permitted abbreviations: "alcohol" → "alc."; "volume" → "vol."
- Tolerances on a single-value statement: ±1.0% for wines above 14% ABV; ±1.5% for wines at or below 14% ABV.
- Range statements: maximum 2% spread above 14% ABV; maximum 3% spread at or below 14%.

Source: https://www.law.cornell.edu/cfr/text/27/4.36

## Distilled Spirits — 27 CFR 5.63 (Mandatory Label Information)

Distilled spirits container labels must show:

- Brand name (per § 5.64), in the same field of vision as class/type and alcohol content.
- Class, type, or other designation (per subpart I of Part 5), in the same field of vision.
- Alcohol content (per § 5.65), in the same field of vision.
- Name and address of the bottler/distiller/importer.
- Net contents (may be blown, embossed, or molded into the container).

Additional disclosures (neutral spirits, age statements, FD&C Yellow No. 5, cochineal/carmine, sulfites, aspartame) are out of scope for this prototype.

Source: https://www.law.cornell.edu/cfr/text/27/5.63

## Malt Beverages — 27 CFR 7.63 (Mandatory Label Information)

Malt beverage container labels must show:

- Brand name (per § 7.64).
- Class, type, or other designation (per subpart I of Part 7).
- Alcohol content — required only when the malt beverage contains alcohol derived from added nonbeverage flavors or other added nonbeverage ingredients.
- Name and address of the bottler or importer (per §§ 7.66–7.68).
- Net contents (per § 7.70).

Additional disclosures (FD&C Yellow No. 5, cochineal/carmine, sulfites, aspartame phenylalanine warning) are out of scope.

Source: https://www.law.cornell.edu/cfr/text/27/7.63

## Notes for the Prototype

- The prototype's Layer 1 well-formedness check should at minimum verify the *presence* of brand name, class/type, alcohol content (when required for the commodity), and net contents on the label as extracted by the model. Name-and-address presence is also testable from OCR but is unlikely to be fakeable to a useful degree in our fixtures, so prioritize the first four.
- For Layer 2 comparison, brand name and alcohol content are the most informative fields against application data because they are concrete strings/numbers; class/type is also useful but vocabulary varies. Country of origin appears in F-046 as an optional application field and is not in the mandatory-field set on the label side; treat it as comparison-only when present in the application.
- Alcohol content format is the strongest grounding for "field-specific matching rules" in REQ-005: the regulation specifies allowable formats (`Alcohol X% by volume`, abbreviations, range form) and *tolerances*. The prototype's comparison should accept any regulation-conformant format and apply the appropriate tolerance rather than a string-equality check.
- Class/type designation has a controlled vocabulary per commodity (Part 4 Subpart D for wine, Part 5 Subpart I for distilled spirits, Part 7 Subpart I for malt beverages). Modeling that vocabulary is out of scope for this prototype; record it as a future-production consideration.
