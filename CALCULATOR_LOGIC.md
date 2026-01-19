# Pivot Point Calculator - Calculation Logic Documentation

## Overview

This document explains the calculation logic for the Pivot Point Calculator application. The calculator supports two modes:
1. **NIFTY Options** - Uses Camarilla method for entry/stop loss and Classic method for targets
2. **Stock Options** - Uses Camarilla method for entry point, Classic method for stop loss and targets, with custom rounding and range-based adjustments

---

## Input Fields

### Common Inputs (Both Tabs)
- **OPEN**: Opening price
- **HIGH**: Highest price
- **LOW**: Lowest price
- **LAST**: Last/closing price

### Stock Options Tab Additional Inputs
- **Stock Name**: Text field for stock identification (optional)
- **Future Close Price**: Future closing price (optional, for reference)

---

## NIFTY Options Tab Calculations

### Step 1: Calculate Camarilla Pivot Points (for Entry Point & Stop Loss)

**Pivot Point (PP):**
```
PP = (HIGH + LOW + LAST) / 3
```

**Resistance Levels (R1-R4):**
```
Range = HIGH - LOW
R1 = LAST + (Range × 1.1) / 12
R2 = LAST + (Range × 1.1) / 6
R3 = LAST + (Range × 1.1) / 4
R4 = LAST + (Range × 1.1) / 2
```

**Support Levels (S1-S4):**
```
S1 = LAST - (Range × 1.1) / 12
S2 = LAST - (Range × 1.1) / 6
S3 = LAST - (Range × 1.1) / 4
S4 = LAST - (Range × 1.1) / 2
```

### Step 2: Calculate Entry Point

**Formula:**
```
Entry Midpoint = (PP + R1) / 2
Entry Point = RoundUp(Entry Midpoint) + 20
```

**Example:**
- If Entry Midpoint = 145.23
- RoundUp(145.23) = 146
- Entry Point = 146 + 20 = **166**

### Step 3: Calculate Stop Loss

**Formula:**
```
Stop Loss Midpoint = (PP + S1) / 2
Stop Loss = RoundUp(Stop Loss Midpoint) - 2
```

**Example:**
- If Stop Loss Midpoint = 143.67
- RoundUp(143.67) = 144
- Stop Loss = 144 - 2 = **142**

### Step 4: Calculate Classic Pivot Points (for Targets)

**Pivot Point (PP):**
```
PP = (HIGH + LOW + LAST) / 3
```

**Resistance Levels (R1-R5):**
```
R1 = 2 × PP - LOW
R2 = PP + (HIGH - LOW)
R3 = HIGH + 2 × (PP - LOW)
R4 = HIGH + 3 × (PP - LOW)
R5 = HIGH + 4 × (PP - LOW)
```

### Step 5: Calculate Targets

**Target 1:**
```
Target 1 = R1 (Classic)
```

**Target 2:**
```
Target 2 = (R1 + R2) / 2
```

**Target 3:**
```
Target 3 = R2 (Classic)
```

**Target 4:**
```
Target 4 = R2 + 16
```

**Target 5:**
```
Target 5 = Target 4 + 20
```

---

## Stock Options Tab Calculations

### Step 1: Calculate Camarilla Pivot Points (for Entry Point)

Same formulas as NIFTY tab (see Step 1 above).

### Step 2: Calculate Entry Point

**Formula:**
```
Entry Midpoint = (Camarilla PP + Camarilla R1) / 2
Rounded Midpoint = RoundEntryPoint(Entry Midpoint)
Range Addition = GetEntryPointRangeAddition(Rounded Midpoint)
Entry Point = Rounded Midpoint + Range Addition
```

#### Entry Point Rounding Logic

The `RoundEntryPoint()` function applies the following rules based on the last decimal digit (hundredths place):

- **Last digit is 0**: Keep as is
  - Example: 1.00 → 1.00, 1.10 → 1.10

- **Last digit is 1-4**: Round up to 5
  - Example: 1.74 → 1.75, 1.81 → 1.85, 1.01 → 1.05

- **Last digit is 5**: Keep as is
  - Example: 1.75 → 1.75, 1.5 → 1.5

- **Last digit is 6-9**: Round up to next 0 (tens place)
  - Example: 1.56 → 1.60, 1.89 → 1.90, 1.06 → 1.10

#### Entry Point Range-Based Additions

Based on the **rounded midpoint value**, add the following:

| Midpoint Range | Addition |
|----------------|----------|
| 1 - 400 | +0.40 paise (0.0040) |
| 401 - 2000 | +0.60 paise (0.0060) |
| 2001 - 3500 | +1.20 rs |
| 3501 - 5000 | +2.40 rs |
| 5001 - 8000 | +4.30 rs |

**Example:**
- Entry Midpoint = 145.23
- RoundEntryPoint(145.23) = 145.25 (last digit 3 → round up to 5)
- Range: 145.25 is in range 1-400
- Addition = 0.0040
- Entry Point = 145.25 + 0.0040 = **145.254**

### Step 3: Calculate Classic Pivot Points (for Stop Loss & Targets)

Same formulas as NIFTY tab Step 4 (see above).

### Step 4: Calculate Stop Loss

**Formula:**
```
Stop Loss Midpoint = (Classic PP + Classic R1) / 2
Rounded Midpoint = RoundStopLoss(Stop Loss Midpoint)
Range Subtraction = GetStopLossRangeSubtraction(Rounded Midpoint)
Stop Loss = Rounded Midpoint - Range Subtraction
```

#### Stop Loss Rounding Logic

The `RoundStopLoss()` function applies the following rules based on the last decimal digit (hundredths place):

- **Last digit is 0**: Keep as is
  - Example: 1.00 → 1.00, 1.10 → 1.10

- **Last digit is 1-4**: Round down to 0
  - Example: 1.71 → 1.70, 1.83 → 1.80

- **Last digit is 5**: Keep as is
  - Example: 1.75 → 1.75

- **Last digit is 6-9**: Round down to 5
  - Example: 1.76 → 1.75, 1.89 → 1.85

#### Stop Loss Range-Based Subtractions

Based on the **rounded midpoint value**, subtract the following:

| Midpoint Range | Subtraction |
|----------------|-------------|
| 1 - 400 | -0.50 paise (0.0050) |
| 401 - 2000 | -2.00 rs |
| 2001 - 3500 | -5.50 rs |
| 3501 - 5000 | -6.60 rs |
| 5001 - 8000 | -8.70 rs |

**Example:**
- Stop Loss Midpoint = 143.67
- RoundStopLoss(143.67) = 143.65 (last digit 7 → round down to 5)
- Range: 143.65 is in range 1-400
- Subtraction = 0.0050
- Stop Loss = 143.65 - 0.0050 = **143.645**

### Step 5: Calculate Targets

**Same as NIFTY tab:**
- Target 1 = R1 (Classic)
- Target 2 = (R1 + R2) / 2
- Target 3 = R2 (Classic)
- Target 4 = R2 + 16
- Target 5 = Target 4 + 20

---

## Complete Calculation Flow

### NIFTY Options Tab Flow

```
1. User inputs: OPEN, HIGH, LOW, LAST
2. Calculate Camarilla PP, R1, S1
3. Calculate Entry Point = RoundUp((PP+R1)/2) + 20
4. Calculate Stop Loss = RoundUp((PP+S1)/2) - 2
5. Calculate Classic R1, R2
6. Calculate Targets:
   - Target 1 = R1
   - Target 2 = (R1+R2)/2
   - Target 3 = R2
   - Target 4 = R2 + 16
   - Target 5 = Target 4 + 20
```

### Stock Options Tab Flow

```
1. User inputs: OPEN, HIGH, LOW, LAST, Stock Name (optional), Future Close Price (optional)
2. Calculate Camarilla PP, R1 (for Entry Point)
3. Calculate Entry Point:
   a. Midpoint = (PP+R1)/2
   b. Rounded = RoundEntryPoint(Midpoint)
   c. Addition = GetEntryPointRangeAddition(Rounded)
   d. Entry Point = Rounded + Addition
4. Calculate Classic PP, R1 (for Stop Loss)
5. Calculate Stop Loss:
   a. Midpoint = (PP+R1)/2
   b. Rounded = RoundStopLoss(Midpoint)
   c. Subtraction = GetStopLossRangeSubtraction(Rounded)
   d. Stop Loss = Rounded - Subtraction
6. Calculate Classic R1, R2 (for Targets)
7. Calculate Targets (same as NIFTY):
   - Target 1 = R1
   - Target 2 = (R1+R2)/2
   - Target 3 = R2
   - Target 4 = R2 + 16
   - Target 5 = Target 4 + 20
```

---

## Key Differences Between Tabs

| Aspect | NIFTY Tab | Stock Options Tab |
|--------|-----------|-------------------|
| **Entry Point Method** | Camarilla | Camarilla |
| **Entry Point Rounding** | RoundUp (ceiling) | Custom RoundEntryPoint() |
| **Entry Point Adjustment** | +20 (fixed) | Range-based addition |
| **Stop Loss Method** | Camarilla | Classic |
| **Stop Loss Rounding** | RoundUp (ceiling) | Custom RoundStopLoss() |
| **Stop Loss Adjustment** | -2 (fixed) | Range-based subtraction |
| **Targets Method** | Classic | Classic |
| **Targets Calculation** | Same for both tabs | Same for both tabs |

---

## Rounding Examples

### Entry Point Rounding (Stock Options)

| Input | Last Digit | Output | Rule |
|-------|------------|--------|------|
| 1.00 | 0 | 1.00 | Keep as is |
| 1.01 | 1 | 1.05 | Round up to 5 |
| 1.06 | 6 | 1.10 | Round up to next 0 |
| 1.74 | 4 | 1.75 | Round up to 5 |
| 1.75 | 5 | 1.75 | Keep as is |
| 1.81 | 1 | 1.85 | Round up to 5 |
| 1.89 | 9 | 1.90 | Round up to next 0 |

### Stop Loss Rounding (Stock Options)

| Input | Last Digit | Output | Rule |
|-------|------------|--------|------|
| 1.70 | 0 | 1.70 | Keep as is |
| 1.71 | 1 | 1.70 | Round down to 0 |
| 1.75 | 5 | 1.75 | Keep as is |
| 1.76 | 6 | 1.75 | Round down to 5 |
| 1.83 | 3 | 1.80 | Round down to 0 |
| 1.89 | 9 | 1.85 | Round down to 5 |

---

## Notes

1. **NIFTY Tab**: Uses LAST value from NIFTY50 site (OPEN, HIGH, LOW, LAST)
2. **Stock Tab**: Additional fields (Stock Name, Future Close Price) are optional and for reference only
3. **Rounding**: All rounding operations maintain 2 decimal places for display
4. **Range Checks**: Range-based additions/subtractions are based on the rounded midpoint value, not the original midpoint
5. **Targets**: Both tabs use identical target calculations using Classic pivot point method
6. **Precision**: Calculations use floating-point arithmetic; results are rounded to 2 decimal places for display

---

## References

- **Camarilla Pivot Points**: Based on Nick Scott's Camarilla equation
- **Classic Pivot Points**: Standard floor trader pivot point calculations
- **Demo Sites**: 
  - https://pivootcalc.web.app/
  - https://www.pivotpointcalculator.com/

