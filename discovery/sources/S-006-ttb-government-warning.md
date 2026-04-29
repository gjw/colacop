# External Source Notes: TTB Government Warning Statement (27 CFR Part 16)

*Reviewed April 29, 2026. Sourced from Cornell LII mirror of the eCFR.*

These notes capture only the regulatory facts the prototype needs to ground REQ-005 (strict warning matching) and REQ-011 (Layer 1 well-formedness). They are not a complete model of 27 CFR Part 16.

The Surgeon General's health warning was created by the Alcoholic Beverage Labeling Act of 1988 (ABLA) and is implemented at 27 CFR Part 16. It applies to all alcoholic beverage containers bottled for sale or distribution in the United States.

## Required Statement (27 CFR 16.21)

The regulation requires the following exact warning statement to appear on the container:

> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

The warning must appear "on the brand label or separate front label, or on a back or side label, separate and apart from all other information."

Source: https://www.law.cornell.edu/cfr/text/27/16.21

## Capitalization and Bolding (27 CFR 16.22)

The opening words "GOVERNMENT WARNING" must appear in capital letters and in bold type. The statement must be readily legible under ordinary conditions and must appear on a contrasting background.

Source: https://www.law.cornell.edu/cfr/text/27/16.22

## Type Size (27 CFR 16.22)

The minimum required type size depends on container size:

- Containers of 237 mL (8 fl. oz.) or less: not smaller than 1 mm.
- Containers more than 237 mL up to 3 L (101 fl. oz.): not smaller than 2 mm.
- Containers more than 3 L: not smaller than 3 mm.

Maximum character density (characters per inch): 40 cpi at 1 mm, 25 cpi at 2 mm, 12 cpi at 3 mm.

Source: https://www.law.cornell.edu/cfr/text/27/16.22

## Notes for the Prototype

- The warning text is regulation-defined and is not part of the application data submitted by the producer; the prototype's Layer 1 (well-formedness) check verifies the label against this fixed text rather than against application fields. This is consistent with F-046 (application JSON does not include the warning).
- "Strict" matching for the warning means exact wording, exact punctuation, and the "GOVERNMENT WARNING" prefix in all caps. The prototype does not need to verify the bold-type or type-size constraints from a label image directly; those would require physical-print verification beyond OCR-from-image scope. Capture the rules in facts so they are not lost, but do not commit to enforcing them.
- The "(1)" and "(2)" inline numbering is part of the regulation as written; whether real-world labels render those numerals or just use sentence breaks varies in practice. Treat presence-or-absence of the numerals as a soft signal for now, not a strict failure.
