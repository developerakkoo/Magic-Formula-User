# Current Implementation Documentation - Pivot Point Calculator

## Overview

This document explains how the pivot point calculations are **currently implemented** in the codebase. It provides detailed code references, step-by-step flows, and examples to help understand and debug the calculation logic.

---

## File Structure

All calculations are implemented in:
- **File**: `magic/src/app/folder/folder.page.ts`
- **Component**: `FolderPage`

---

## NIFTY Options Tab - Current Implementation

### Input Fields
- **OPEN**: Opening price (from NIFTY50 site)
- **HIGH**: Highest price (from NIFTY50 site)
- **LOW**: Lowest price (from NIFTY50 site)
- **LAST**: Last/closing price (from NIFTY50 site)

### Step 1: Calculate Camarilla Pivot Points

**Code Location**: ```134:150:magic/src/app/folder/folder.page.ts```

**Method**: `calculateCamarillaPivotPoints(high, low, last)`

**Formulas**:
```typescript
Range = HIGH - LOW
PP = (HIGH + LOW + LAST) / 3

R1 = LAST + (Range × 1.1) / 12
R2 = LAST + (Range × 1.1) / 6
R3 = LAST + (Range × 1.1) / 4
R4 = LAST + (Range × 1.1) / 2

S1 = LAST - (Range × 1.1) / 12
S2 = LAST - (Range × 1.1) / 6
S3 = LAST - (Range × 1.1) / 4
S4 = LAST - (Range × 1.1) / 2
```

**Returns**: `{ pp, r1, r2, r3, r4, s1, s2, s3, s4 }`

**Reference Sites**:
- https://pivootcalc.web.app/
- https://www.pivotpointcalculator.com/

### Step 2: Calculate Entry Point

**Code Location**: ```165:176:magic/src/app/folder/folder.page.ts```

**Method**: `calculateNiftyEntryStopLoss(camarillaPP, camarillaR1, camarillaS1)`

**Formula**:
```typescript
Entry Midpoint = (PP + R1) / 2
Entry Point = Math.ceil(Entry Midpoint) + 20
```

**Helper Function**: ```129:132:magic/src/app/folder/folder.page.ts```
```typescript
roundUp(value: number): number {
  return Math.ceil(value);  // Always rounds UP to nearest integer
}
```

**Examples**:
- Entry Midpoint = 145.01 → `Math.ceil(145.01)` = 146 → Entry Point = 146 + 20 = **166**
- Entry Midpoint = 145.80 → `Math.ceil(145.80)` = 146 → Entry Point = 146 + 20 = **166**
- Entry Midpoint = 145.00 → `Math.ceil(145.00)` = 145 → Entry Point = 145 + 20 = **165**
- Entry Midpoint = 145.99 → `Math.ceil(145.99)` = 146 → Entry Point = 146 + 20 = **166**

**Key Point**: `Math.ceil()` **always rounds UP** to the nearest integer, regardless of decimal value.

### Step 3: Calculate Stop Loss

**Code Location**: ```165:176:magic/src/app/folder/folder.page.ts```

**Method**: `calculateNiftyEntryStopLoss(camarillaPP, camarillaR1, camarillaS1)` (same method)

**Formula**:
```typescript
Stop Loss Midpoint = (PP + S1) / 2
Stop Loss = Math.ceil(Stop Loss Midpoint) - 2
```

**Examples**:
- Stop Loss Midpoint = 143.01 → `Math.ceil(143.01)` = 144 → Stop Loss = 144 - 2 = **142**
- Stop Loss Midpoint = 143.80 → `Math.ceil(143.80)` = 144 → Stop Loss = 144 - 2 = **142**
- Stop Loss Midpoint = 143.00 → `Math.ceil(143.00)` = 143 → Stop Loss = 143 - 2 = **141**

### Step 4: Calculate Classic Pivot Points (for Targets)

**Code Location**: ```152:163:magic/src/app/folder/folder.page.ts```

**Method**: `calculateClassicPivotPoints(high, low, last)`

**Formulas**:
```typescript
PP = (HIGH + LOW + LAST) / 3

R1 = 2 × PP - LOW
R2 = PP + (HIGH - LOW)
R3 = HIGH + 2 × (PP - LOW)
R4 = HIGH + 3 × (PP - LOW)
R5 = HIGH + 4 × (PP - LOW)
```

**Returns**: `{ pp, r1, r2, r3, r4, r5 }`

**Note**: This is a **separate calculation** from Camarilla. The PP value is recalculated here (same formula, but separate computation).

### Step 5: Calculate Targets

**Code Location**: ```178:196:magic/src/app/folder/folder.page.ts```

**Method**: `calculateNiftyTargets(classicR1, classicR2)`

**Formulas**:
```typescript
Target 1 = R1 (Classic)
Target 2 = (R1 + R2) / 2
Target 3 = R2 (Classic)
Target 4 = R2 + 16
Target 5 = Target 4 + 20
```

**Example Calculation**:
```
If Classic R1 = 150.50 and Classic R2 = 155.75:

Target 1 = 150.50
Target 2 = (150.50 + 155.75) / 2 = 153.125
Target 3 = 155.75
Target 4 = 155.75 + 16 = 171.75
Target 5 = 171.75 + 20 = 191.75
```

### Complete NIFTY Calculation Flow

**Code Location**: ```350:377:magic/src/app/folder/folder.page.ts```

**Method**: `calculatePivotPoints()` - NIFTY branch

```typescript
1. Get inputs: OPEN, HIGH, LOW, LAST
2. Calculate Camarilla PP, R1, S1
   → camarilla = calculateCamarillaPivotPoints(high, low, last)
3. Calculate Entry Point and Stop Loss
   → { entryPoint, stopLoss } = calculateNiftyEntryStopLoss(
       camarilla.pp, camarilla.r1, camarilla.s1)
4. Calculate Classic R1, R2 (for targets)
   → classic = calculateClassicPivotPoints(high, low, last)
5. Calculate Targets
   → targets = calculateNiftyTargets(classic.r1, classic.r2)
6. Set results to pivotResults object
```

---

## Stock Options Tab - Current Implementation

### Input Fields
- **OPEN**: Opening price
- **HIGH**: Highest price
- **LOW**: Lowest price
- **LAST**: Last/closing price
- **Stock Name**: Text field (optional, for reference)
- **Future Close Price**: Number field (optional, for reference)

### Step 1: Calculate Camarilla Pivot Points (for Entry Point)

**Code Location**: ```134:150:magic/src/app/folder/folder.page.ts```

**Method**: `calculateCamarillaPivotPoints(high, low, last)`

**Same formulas as NIFTY** (see NIFTY Step 1 above).

### Step 2: Calculate Entry Point

**Code Location**: ```294:307:magic/src/app/folder/folder.page.ts```

**Method**: `calculateStockEntryPoint(camarillaPP, camarillaR1)`

**Formula**:
```typescript
Entry Midpoint = (PP + R1) / 2
Rounded Midpoint = roundEntryPoint(Entry Midpoint)
Range Addition = getEntryPointRangeAddition(Rounded Midpoint)
Entry Point = Rounded Midpoint + Range Addition
```

#### Entry Point Rounding Logic

**Code Location**: ```198:228:magic/src/app/folder/folder.page.ts```

**Method**: `roundEntryPoint(value)`

**Rules** (based on last decimal digit - hundredths place):
- **Last digit is 0**: Keep as is
  - Example: 1.00 → 1.00, 1.10 → 1.10
- **Last digit is 1-4**: Round up to 5
  - Example: 1.74 → 1.75, 1.81 → 1.85, 1.01 → 1.05
- **Last digit is 5**: Keep as is
  - Example: 1.75 → 1.75, 1.5 → 1.5
- **Last digit is 6-9**: Round up to next 0 (tens place)
  - Example: 1.56 → 1.60, 1.89 → 1.90, 1.06 → 1.10

#### Entry Point Range-Based Additions

**Code Location**: ```262:276:magic/src/app/folder/folder.page.ts```

**Method**: `getEntryPointRangeAddition(midpoint)`

**Range Table** (based on **rounded midpoint value**):

| Midpoint Range | Addition |
|----------------|----------|
| 1 - 400 | +0.40 paise (0.0040) |
| 401 - 2000 | +0.60 paise (0.0060) |
| 2001 - 3500 | +1.20 rs |
| 3501 - 5000 | +2.40 rs |
| 5001 - 8000 | +4.30 rs |

**Example**:
```
Entry Midpoint = 145.23
→ roundEntryPoint(145.23) = 145.25 (last digit 3 → round up to 5)
→ Range: 145.25 is in range 1-400
→ Addition = 0.0040
→ Entry Point = 145.25 + 0.0040 = 145.254
```

### Step 3: Calculate Classic Pivot Points (for Stop Loss)

**Code Location**: ```152:163:magic/src/app/folder/folder.page.ts```

**Method**: `calculateClassicPivotPoints(high, low, last)`

**Same formulas as NIFTY Step 4** (see above).

### Step 4: Calculate Stop Loss

**Code Location**: ```309:322:magic/src/app/folder/folder.page.ts```

**Method**: `calculateStockStopLoss(classicPP, classicR1)`

**Formula**:
```typescript
Stop Loss Midpoint = (PP + R1) / 2
Rounded Midpoint = roundStopLoss(Stop Loss Midpoint)
Range Subtraction = getStopLossRangeSubtraction(Rounded Midpoint)
Stop Loss = Rounded Midpoint - Range Subtraction
```

#### Stop Loss Rounding Logic

**Code Location**: ```230:260:magic/src/app/folder/folder.page.ts```

**Method**: `roundStopLoss(value)`

**Rules** (based on last decimal digit - hundredths place):
- **Last digit is 0**: Keep as is
  - Example: 1.00 → 1.00, 1.10 → 1.10
- **Last digit is 1-4**: Round down to 0
  - Example: 1.71 → 1.70, 1.83 → 1.80
- **Last digit is 5**: Keep as is
  - Example: 1.75 → 1.75
- **Last digit is 6-9**: Round down to 5
  - Example: 1.76 → 1.75, 1.89 → 1.85

#### Stop Loss Range-Based Subtractions

**Code Location**: ```278:292:magic/src/app/folder/folder.page.ts```

**Method**: `getStopLossRangeSubtraction(midpoint)`

**Range Table** (based on **rounded midpoint value**):

| Midpoint Range | Subtraction |
|----------------|-------------|
| 1 - 400 | -0.50 paise (0.0050) |
| 401 - 2000 | -2.00 rs |
| 2001 - 3500 | -5.50 rs |
| 3501 - 5000 | -6.60 rs |
| 5001 - 8000 | -8.70 rs |

**Example**:
```
Stop Loss Midpoint = 143.67
→ roundStopLoss(143.67) = 143.65 (last digit 7 → round down to 5)
→ Range: 143.65 is in range 1-400
→ Subtraction = 0.0050
→ Stop Loss = 143.65 - 0.0050 = 143.645
```

### Step 5: Calculate Targets

**Code Location**: ```324:342:magic/src/app/folder/folder.page.ts```

**Method**: `calculateStockTargets(entryPoint)`

**Formula** (incremental from Entry Point):
```typescript
Target 1 = Entry Point + 0.45
Target 2 = Target 1 + 0.60
Target 3 = Target 2 + 0.56
Target 4 = Target 3 + 0.60
Target 5 = Target 4 + 0.55
```

**Example**:
```
If Entry Point = 145.254:

Target 1 = 145.254 + 0.45 = 145.704
Target 2 = 145.704 + 0.60 = 146.304
Target 3 = 146.304 + 0.56 = 146.864
Target 4 = 146.864 + 0.60 = 147.464
Target 5 = 147.464 + 0.55 = 148.014
```

**Key Difference**: Stock Options targets are **NOT** based on Classic pivot points. They are calculated incrementally from the Entry Point.

### Complete Stock Options Calculation Flow

**Code Location**: ```377:404:magic/src/app/folder/folder.page.ts```

**Method**: `calculatePivotPoints()` - Stock branch

```typescript
1. Get inputs: OPEN, HIGH, LOW, LAST, Stock Name (optional), Future Close Price (optional)
2. Calculate Camarilla PP, R1 (for Entry Point)
   → camarilla = calculateCamarillaPivotPoints(high, low, last)
3. Calculate Entry Point (Camarilla)
   → entryPoint = calculateStockEntryPoint(camarilla.pp, camarilla.r1)
4. Calculate Classic PP, R1 (for Stop Loss)
   → classic = calculateClassicPivotPoints(high, low, last)
5. Calculate Stop Loss (Classic)
   → stopLoss = calculateStockStopLoss(classic.pp, classic.r1)
6. Calculate Targets (incremental from Entry Point)
   → targets = calculateStockTargets(entryPoint)
7. Set results to pivotResults object
```

---

## Key Differences Between NIFTY and Stock Options

| Aspect | NIFTY Tab | Stock Options Tab |
|--------|-----------|-------------------|
| **Entry Point Method** | Camarilla | Camarilla |
| **Entry Point Rounding** | `Math.ceil()` (always round up to integer) | Custom `roundEntryPoint()` (rounds to .00, .05, .10) |
| **Entry Point Adjustment** | +20 (fixed) | Range-based addition (0.0040 to 4.30) |
| **Stop Loss Method** | Camarilla (uses S1) | Classic (uses R1) |
| **Stop Loss Rounding** | `Math.ceil()` (always round up to integer) | Custom `roundStopLoss()` (rounds to .00, .05, .10) |
| **Stop Loss Adjustment** | -2 (fixed) | Range-based subtraction (0.0050 to 8.70) |
| **Targets Method** | Classic (R1, R2) | Incremental (from Entry Point) |
| **Target Calculation** | Based on Classic R1/R2 | T1 = Entry + 0.45, then incremental |

---

## Common Issues and Debugging

### Issue: Targets Not Matching Expected Values

**For NIFTY Tab**:
1. Verify Classic R1 and R2 are calculated correctly
2. Check that Target 2 uses midpoint: `(R1 + R2) / 2`
3. Verify Target 4 = R2 + 16
4. Verify Target 5 = Target 4 + 20

**For Stock Options Tab**:
1. Verify Entry Point is calculated correctly first
2. Check that targets are incremental:
   - T1 = Entry + 0.45
   - T2 = T1 + 0.60
   - T3 = T2 + 0.56
   - T4 = T3 + 0.60
   - T5 = T4 + 0.55
3. **Important**: Stock targets are NOT based on Classic pivot points

### Issue: Entry Point Not Rounding Correctly

**For NIFTY Tab**:
- Verify `Math.ceil()` is used (always rounds UP)
- Example: 145.01 → 146, 145.80 → 146, 145.99 → 146

**For Stock Options Tab**:
- Verify `roundEntryPoint()` logic:
  - Last digit 1-4 → round up to 5
  - Last digit 5 → keep as is
  - Last digit 6-9 → round up to next 0

### Issue: Range-Based Additions/Subtractions Not Applied

**For Stock Options Tab**:
1. Verify the **rounded midpoint** value is used for range check (not the original midpoint)
2. Check range boundaries:
   - 1-400: uses paise (0.0040 or 0.0050)
   - 401-2000: uses paise (0.0060) or rs (2.00)
   - 2001+: uses rs values

---

## Testing Examples

### NIFTY Tab Test Case

**Inputs**:
- OPEN = 15000
- HIGH = 15100
- LOW = 14900
- LAST = 15050

**Expected Flow**:
1. Camarilla PP = (15100 + 14900 + 15050) / 3 = 15016.67
2. Range = 15100 - 14900 = 200
3. Camarilla R1 = 15050 + (200 × 1.1) / 12 = 15068.33
4. Entry Midpoint = (15016.67 + 15068.33) / 2 = 15042.50
5. Entry Point = Math.ceil(15042.50) + 20 = 15043 + 20 = **15063**

6. Classic PP = (15100 + 14900 + 15050) / 3 = 15016.67
7. Classic R1 = 2 × 15016.67 - 14900 = 15133.34
8. Classic R2 = 15016.67 + (15100 - 14900) = 15216.67
9. Target 1 = 15133.34
10. Target 2 = (15133.34 + 15216.67) / 2 = 15175.005
11. Target 3 = 15216.67
12. Target 4 = 15216.67 + 16 = 15232.67
13. Target 5 = 15232.67 + 20 = 15252.67

### Stock Options Tab Test Case

**Inputs**:
- OPEN = 100
- HIGH = 105
- LOW = 95
- LAST = 102

**Expected Flow**:
1. Camarilla PP = (105 + 95 + 102) / 3 = 100.67
2. Range = 105 - 95 = 10
3. Camarilla R1 = 102 + (10 × 1.1) / 12 = 102.92
4. Entry Midpoint = (100.67 + 102.92) / 2 = 101.795
5. Rounded = roundEntryPoint(101.795) = 101.80 (last digit 5 → keep, but 9 rounds up)
   - Actually: 101.795 → last digit is 5, but we need to check hundredths: 101.79 → last digit 9 → round up to 101.80
6. Range Addition (101.80 in 1-400) = 0.0040
7. Entry Point = 101.80 + 0.0040 = **101.804**

8. Classic PP = (105 + 95 + 102) / 3 = 100.67
9. Classic R1 = 2 × 100.67 - 95 = 106.34
10. Stop Loss Midpoint = (100.67 + 106.34) / 2 = 103.505
11. Rounded = roundStopLoss(103.505) = 103.50 (last digit 5 → keep)
12. Range Subtraction (103.50 in 1-400) = 0.0050
13. Stop Loss = 103.50 - 0.0050 = **103.495**

14. Target 1 = 101.804 + 0.45 = 102.254
15. Target 2 = 102.254 + 0.60 = 102.854
16. Target 3 = 102.854 + 0.56 = 103.414
17. Target 4 = 103.414 + 0.60 = 104.014
18. Target 5 = 104.014 + 0.55 = 104.564

---

## Code Reference Summary

| Calculation | Method Name | Line Numbers |
|-------------|-------------|--------------|
| Camarilla Pivot Points | `calculateCamarillaPivotPoints()` | 134-150 |
| Classic Pivot Points | `calculateClassicPivotPoints()` | 152-163 |
| Round Up Helper | `roundUp()` | 129-132 |
| NIFTY Entry/Stop Loss | `calculateNiftyEntryStopLoss()` | 165-176 |
| NIFTY Targets | `calculateNiftyTargets()` | 178-196 |
| Stock Entry Point Rounding | `roundEntryPoint()` | 198-228 |
| Stock Stop Loss Rounding | `roundStopLoss()` | 230-260 |
| Entry Point Range Addition | `getEntryPointRangeAddition()` | 262-276 |
| Stop Loss Range Subtraction | `getStopLossRangeSubtraction()` | 278-292 |
| Stock Entry Point | `calculateStockEntryPoint()` | 294-307 |
| Stock Stop Loss | `calculateStockStopLoss()` | 309-322 |
| Stock Targets | `calculateStockTargets()` | 324-342 |
| Main Calculation Flow | `calculatePivotPoints()` | 344-404 |

---

## Notes

1. **NIFTY Tab**: Uses LAST value from NIFTY50 site (OPEN, HIGH, LOW, LAST)
2. **Stock Options Tab**: Stock Name and Future Close Price are optional and used for reference only (not in calculations)
3. **Rounding Precision**: All calculations use floating-point arithmetic; results are displayed with 2 decimal places
4. **Range Checks**: For Stock Options, range-based additions/subtractions are based on the **rounded midpoint value**, not the original midpoint
5. **Target Differences**: NIFTY uses Classic pivot points for targets, while Stock Options uses incremental calculation from Entry Point

---

## Last Updated

- **Date**: Current implementation as of latest code review
- **File**: `magic/src/app/folder/folder.page.ts`
- **Version**: Based on Stock Options incremental target implementation

