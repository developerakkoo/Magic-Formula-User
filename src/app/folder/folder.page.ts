import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { SubscriptionService } from '../services/subscription.service';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
  animations: [
    trigger('resultsAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('cardSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class FolderPage implements OnInit {
  public folder!: string;
  public notificationCount = 3; // Example notification count
  public selectedSegment = 'nifty';
  public calculatorForm: FormGroup;
  public showResults = false;
  public pivotResults = {
    entryPoint: 0,
    stopLoss: 0,
    targetOne: 0,
    targetTwo: 0,
    targetThree: 0,
    targetFour: 0,
    targetFive: 0
  };
  
  // Subscription properties
  public hasActiveSubscription: boolean = false;
  public isCheckingSubscription: boolean = true;
  public activeSubscription: any = null;

  private activatedRoute = inject(ActivatedRoute);
  
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private authService: AuthService
  ) {
    this.calculatorForm = this.formBuilder.group({
      open: ['', [Validators.required, Validators.min(0)]],
      high: ['', [Validators.required, Validators.min(0)]],
      low: ['', [Validators.required, Validators.min(0)]],
      last: ['', [Validators.required, Validators.min(0)]],
      stockName: [''],
      futureClosePrice: ['', [Validators.min(0)]], 
    });
  }

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') || 'Home';
    this.checkSubscriptionStatus();
  }

  async checkSubscriptionStatus() {
    this.isCheckingSubscription = true;
    
    try {
      const subscription = await firstValueFrom(
        this.subscriptionService.getMySubscription()
      );
      
      if (subscription) {
        this.hasActiveSubscription = true;
        this.activeSubscription = subscription;
      } else {
        this.hasActiveSubscription = false;
        this.activeSubscription = null;
      }
    } catch (error) {
      // If error (401, 404, etc.), assume no subscription
      console.log('No active subscription found');
      this.hasActiveSubscription = false;
      this.activeSubscription = null;
    } finally {
      this.isCheckingSubscription = false;
    }
  }

  navigateToSubscriptions() {
    this.router.navigate(['/subscriptions']);
  }

  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    console.log('Segment changed to:', this.selectedSegment);

    this.showResults = false;
    this.applySegmentValidators();
  }

  private applySegmentValidators(): void {
    if (this.selectedSegment === 'stock') {
      this.calculatorForm.get('stockName')?.clearValidators();
      this.calculatorForm.get('futureClosePrice')?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      this.calculatorForm.get('stockName')?.clearValidators();
      this.calculatorForm.get('futureClosePrice')?.clearValidators();
    }
    this.calculatorForm.get('stockName')?.updateValueAndValidity();
    this.calculatorForm.get('futureClosePrice')?.updateValueAndValidity();
  }

  clearCalculatorInputs(): void {
    this.calculatorForm.reset({
      open: '',
      high: '',
      low: '',
      last: '',
      stockName: '',
      futureClosePrice: ''
    });
    this.showResults = false;
    this.pivotResults = {
      entryPoint: 0,
      stopLoss: 0,
      targetOne: 0,
      targetTwo: 0,
      targetThree: 0,
      targetFour: 0,
      targetFive: 0
    };
    this.applySegmentValidators();
  }

  // Helper function to round up to nearest integer
  roundUp(value: number): number {
    return Math.ceil(value);
  }

  roundDown(value: number): number {
    return Math.floor(value);
  }

  /**
   * Stock target tick: floor to 0.05 (e.g. 10.43 -> 10.40, 10.49 -> 10.45, 10.46 -> 10.45, 10.41 -> 10.40).
   */
  roundStockTargetToNickel(value: number): number {
    return Math.floor(value * 20 + 1e-9) / 20;
  }

  // Calculate Camarilla Pivot Points (for Entry/Stop Loss)
  calculateCamarillaPivotPoints(high: number, low: number, last: number) {
    console.group('[Stock Tab] Camarilla Pivot Points Calculation');
    console.log('[Step 1] Input values:', { high, low, last });
    
    const range = high - low;
    console.log('[Step 2] Range:', range, `(HIGH - LOW: ${high} - ${low})`);
    
    const pp = (high + low + last) / 3;
    console.log('[Step 3] Pivot Point (PP):', pp, `((HIGH + LOW + LAST) / 3: (${high} + ${low} + ${last}) / 3)`);
    
    const r1 = last + (range * 1.1) / 12;
    const r2 = last + (range * 1.1) / 6;
    const r3 = last + (range * 1.1) / 4;
    const r4 = last + (range * 1.1) / 2;
    
    const s1 = last - (range * 1.1) / 12;
    const s2 = last - (range * 1.1) / 6;
    const s3 = last - (range * 1.1) / 4;
    const s4 = last - (range * 1.1) / 2;
    
    console.log('[Step 4] Resistance levels:', { r1, r2, r3, r4 });
    console.log('[Step 5] Support levels:', { s1, s2, s3, s4 });
    console.log('[Result] Camarilla values:', { pp, r1, r2, r3, r4, s1, s2, s3, s4 });
    console.groupEnd();
    
    return { pp, r1, r2, r3, r4, s1, s2, s3, s4 };
  }

  // Calculate Classic Pivot Points (for Targets)
  // Formulas based on demo_new.html Classic calculation
  calculateClassicPivotPoints(high: number, low: number, last: number) {
    console.group('[Stock Tab] Classic Pivot Points Calculation');
    console.log('[Step 1] Input values:', { high, low, last });
    
    // Calculate Range
    const range = high - low;
    console.log('[Step 2] Range:', range, `(HIGH - LOW: ${high} - ${low})`);
    
    // Pivot Point (PP) = (HIGH + LOW + LAST) / 3
    const pp = (high + low + last) / 3;
    console.log('[Step 3] Pivot Point (PP):', pp, `((HIGH + LOW + LAST) / 3: (${high} + ${low} + ${last}) / 3)`);
    
    // Classic Resistance Levels (from demo):
    // R4 = PP + RANGE × 3
    const r4 = pp + range * 3;
    console.log('[Step 4] R4:', r4, `(PP + RANGE × 3: ${pp} + ${range} × 3)`);
    
    
    // R3 = PP + RANGE × 2
    const r3 = pp + range * 2;
    console.log('[Step 5] R3:', r3, `(PP + RANGE × 2: ${pp} + ${range} × 2)`);
    
    // R2 = PP + RANGE
    const r2 = pp + range;
    console.log('[Step 6] R2:', r2, `(PP + RANGE: ${pp} + ${range})`);
    
    // R1 = 2 × PP - LOW
    const r1 = 2 * pp - low;
    console.log('[Step 7] R1:', r1, `(2 × PP - LOW: 2 × ${pp} - ${low})`);
    
    // Classic Support Levels (from demo):
    // S1 = 2 × PP - HIGH
    const s1 = 2 * pp - high;
    console.log('[Step 8] S1:', s1, `(2 × PP - HIGH: 2 × ${pp} - ${high})`);
    
    // S2 = PP - RANGE
    const s2 = pp - range;
    console.log('[Step 9] S2:', s2, `(PP - RANGE: ${pp} - ${range})`);
    
    // S3 = PP - RANGE × 2
    const s3 = pp - range * 2;
    console.log('[Step 10] S3:', s3, `(PP - RANGE × 2: ${pp} - ${range} × 2)`);
    
    // S4 = PP - RANGE × 3
    const s4 = pp - range * 3;
    console.log('[Step 11] S4:', s4, `(PP - RANGE × 3: ${pp} - ${range} × 3)`);
    
    console.log('[Result] Classic values:', { pp, r1, r2, r3, r4, s1, s2, s3, s4 });
    console.groupEnd();
    
    return { pp, r1, r2, r3, r4, s1, s2, s3, s4 };
  }

  // Calculate NIFTY Entry Point and Stop Loss
  calculateNiftyEntryStopLoss(camarillaPP: number, camarillaR1: number, camarillaS1: number) {
    // Entry Point = midpoint(PP, R1) rounded up + 20
    const entryMidpoint = (camarillaPP + camarillaR1) / 2;
    const entryPoint = this.roundUp(entryMidpoint) + 20;
    
    // Stop Loss = midpoint(PP, S1) rounded up - 2
    const stopLossMidpoint = (camarillaPP + camarillaS1) / 2;
    const stopLoss = this.roundUp(stopLossMidpoint) - 2;
    
    return { entryPoint, stopLoss };
  }

  // Calculate NIFTY Targets
  // IMPORTANT: All calculations use exact values with NO rounding applied
  // Rounding only occurs in display formatting (number pipe in template)
  calculateNiftyTargets(classicPP: number, classicR1: number, classicR2: number) {
    // Target 1 = (PP + R1) / 2 - midpoint of PP and R1, exact value, no rounding
    const targetOne = (classicPP + classicR1) / 2;
    
    // Target 2 = MIDPOINT ((R1 + R2) / 2) - exact midpoint calculation, NO rounding
    // This is the exact mathematical midpoint between R1 and R2
    // const targetTwo = (classicR1 + classicR2) / 2;
    const targetTwo = classicR1;


    const targetThree = (classicR1 + classicR2) / 2;
    // Target 3 = R2 (Classic) - exact value, no rounding
    const targetFour = classicR2;
    
    // Target 4 = R2 + 16 - exact calculation, no rounding
    const targetFive = classicR2 + 16;

    console.log('[NIFTY Tab] Targets:', { targetOne, targetTwo, targetThree, targetFour, targetFive });
    
    
    // Target 5 = Target 4 + 20 - uses exact Target 4 value, no rounding
    // const targetFive = targetFour + 20;
    // Round Target Five to 2 decimal places
    const targetFiveRounded = this.roundDown(targetFive);
    const targetFourRounded = this.roundDown(targetFour);
    const targetThreeRounded = this.roundDown(targetThree);
    const targetTwoRounded = this.roundDown(targetTwo);
    const targetOneRounded = this.roundDown(targetOne);

    return { targetOneRounded, targetTwoRounded, targetThreeRounded, targetFourRounded, targetFiveRounded };
  }

  /**
   * Stock options: Classic ladder T1..T5 from PP, R1, R2, R3 (nickel-rounded).
   */
  calculateStockTargetsFromClassic(pp: number, r1: number, r2: number, r3: number) {
    console.group('[Stock Tab] Classic target ladder');
    const targetOneRounded = this.roundStockTargetToNickel((pp + r1) / 2);
    const targetTwoRounded = this.roundStockTargetToNickel(r1);
    const targetThreeRounded = this.roundStockTargetToNickel((r1 + r2) / 2);
    const targetFourRounded = this.roundStockTargetToNickel(r2);
    const targetFiveRounded = this.roundStockTargetToNickel((r2 + r3) / 2);
    console.log('[Result] Base targets:', {
      targetOneRounded,
      targetTwoRounded,
      targetThreeRounded,
      targetFourRounded,
      targetFiveRounded,
    });
    console.groupEnd();
    return {
      targetOneRounded,
      targetTwoRounded,
      targetThreeRounded,
      targetFourRounded,
      targetFiveRounded,
    };
  }

  /**
   * Drops targets strictly below entry, relabels, then fills from classic R3/R4 (+step pattern).
   * Used for NIFTY (integer floor) and Stock (nickel floor).
   */
  private finalizeTargetsAgainstEntry(
    entryPoint: number,
    classic: { r3: number; r4: number },
    base: {
      targetOneRounded: number;
      targetTwoRounded: number;
      targetThreeRounded: number;
      targetFourRounded: number;
      targetFiveRounded: number;
    },
    options: { roundLevel: (n: number) => number; step: number; logLabel: string }
  ): {
    targetOneRounded: number;
    targetTwoRounded: number;
    targetThreeRounded: number;
    targetFourRounded: number;
    targetFiveRounded: number;
  } {
    const { roundLevel, step, logLabel } = options;
    const baseArr = [
      base.targetOneRounded,
      base.targetTwoRounded,
      base.targetThreeRounded,
      base.targetFourRounded,
      base.targetFiveRounded,
    ];

    if (baseArr.every((t) => t >= entryPoint)) {
      return base;
    }

    console.group(`[${logLabel}] Finalize targets vs entry`);
    console.log('[Step 1] Entry:', entryPoint, 'Base targets:', baseArr);

    const filtered = baseArr.filter((t) => t >= entryPoint);
    const valid = [...new Set(filtered)].sort((a, b) => a - b);

    const extensions = [
      roundLevel(classic.r3),
      roundLevel(classic.r3 + step),
      roundLevel(classic.r4),
      roundLevel(classic.r4 + step),
    ];

    const chain: number[] = [...valid];

    for (const c of extensions) {
      if (chain.length >= 5) {
        break;
      }
      const prev = chain.length === 0 ? undefined : chain[chain.length - 1];
      if (prev === undefined) {
        if (c >= entryPoint) {
          chain.push(c);
        }
      } else if (c > prev) {
        chain.push(c);
      }
    }

    if (chain.length === 0) {
      console.warn(
        `[${logLabel}] No targets at or above entry from base or R3/R4 extensions; using +${step} ladder above entry.`
      );
      let k = 1;
      while (chain.length < 5) {
        chain.push(roundLevel(entryPoint + k * step));
        k += 1;
      }
    } else {
      while (chain.length < 5) {
        const last = chain[chain.length - 1];
        chain.push(roundLevel(last + step));
      }
    }

    const finalFive = chain.slice(0, 5);
    console.log('[Result] Final targets:', finalFive);
    console.groupEnd();

    return {
      targetOneRounded: finalFive[0],
      targetTwoRounded: finalFive[1],
      targetThreeRounded: finalFive[2],
      targetFourRounded: finalFive[3],
      targetFiveRounded: finalFive[4],
    };
  }

  // Round Entry Point for Stock Options
  // Examples: 1.74 → 1.75, 1.81 → 1.85, 1.75 → 1.75, 1.56 → 1.60, 1.89 → 1.90, 1.01 → 1.05, 1.06 → 1.10
  roundEntryPoint(value: number): number {
    console.group('[Stock Tab] Entry Point Rounding');
    console.log('[Step 1] Input value:', value);
    
    // Round to 2 decimal places first to handle floating point precision
    const rounded = Math.round(value * 100) / 100;
    console.log('[Step 2] Rounded to 2 decimals:', rounded);
    
    // Get the integer part and decimal part
    const integerPart = Math.floor(rounded);
    const decimalPart = rounded - integerPart;
    console.log('[Step 3] Integer part:', integerPart, 'Decimal part:', decimalPart);
    
    // Get the last decimal digit (hundredths place)
    const lastDigit = Math.round((decimalPart * 100) % 10);
    console.log('[Step 4] Last digit (hundredths place):', lastDigit);
    
    let result: number;
    let rule: string;
    
    if (lastDigit === 0) {
      // Already rounded to .00, .10, .20, etc. (like 1.00, 1.10, 1.20)
      result = rounded;
      rule = 'Keep as is (last digit is 0)';
    } else if (lastDigit >= 1 && lastDigit <= 4) {
      // Round up to 5 (e.g., 1.74 → 1.75, 1.81 → 1.85, 1.01 → 1.05)
      const tensPlace = Math.floor(decimalPart * 10);
      result = integerPart + tensPlace / 10 + 0.05;
      rule = `Round up to 5 (last digit is ${lastDigit})`;
    } else if (lastDigit === 5) {
      // Keep as is (e.g., 1.75 → 1.75, 1.5 → 1.5)
      result = rounded;
      rule = 'Keep as is (last digit is 5)';
    } else if (lastDigit >= 6 && lastDigit <= 9) {
      // Round up to next 0 (e.g., 1.56 → 1.60, 1.89 → 1.90, 1.06 → 1.10)
      const tensPlace = Math.ceil(decimalPart * 10);
      result = integerPart + tensPlace / 10;
      rule = `Round up to next 0 (last digit is ${lastDigit})`;
    } else {
      result = rounded;
      rule = 'Fallback (no rule matched)';
    }
    
    console.log('[Step 5] Rule applied:', rule);
    console.log('[Result] Final rounded value:', result);
    console.groupEnd();
    
    return result;
  }

  // Round Stop Loss for Stock Options
  // Examples: 1.71 → 1.70, 1.83 → 1.80, 1.75 → 1.75, 1.76 → 1.75, 1.89 → 1.85
  roundStopLoss(value: number): number {
    console.group('[Stock Tab] Stop Loss Rounding');
    console.log('[Step 1] Input value:', value);
    
    // Round to 2 decimal places first to handle floating point precision
    const rounded = Math.round(value * 100) / 100;
    console.log('[Step 2] Rounded to 2 decimals:', rounded);
    
    // Get the integer part and decimal part
    const integerPart = Math.floor(rounded);
    const decimalPart = rounded - integerPart;
    console.log('[Step 3] Integer part:', integerPart, 'Decimal part:', decimalPart);
    
    // Get the last decimal digit (hundredths place)
    const lastDigit = Math.round((decimalPart * 100) % 10);
    console.log('[Step 4] Last digit (hundredths place):', lastDigit);
    
    let result: number;
    let rule: string;
    
    if (lastDigit === 0) {
      // Already rounded to .00, .10, .20, etc. (like 1.00, 1.10, 1.20)
      result = rounded;
      rule = 'Keep as is (last digit is 0)';
    } else if (lastDigit >= 1 && lastDigit <= 4) {
      // Round down to 0 (e.g., 1.71 → 1.70, 1.83 → 1.80)
      const tensPlace = Math.floor(decimalPart * 10);
      result = integerPart + tensPlace / 10;
      rule = `Round down to 0 (last digit is ${lastDigit})`;
    } else if (lastDigit === 5) {
      // Keep as is (e.g., 1.75 → 1.75)
      result = rounded;
      rule = 'Keep as is (last digit is 5)';
    } else if (lastDigit >= 6 && lastDigit <= 9) {
      // Round down to 5 (e.g., 1.76 → 1.75, 1.89 → 1.85)
      const tensPlace = Math.floor(decimalPart * 10);
      result = integerPart + tensPlace / 10 + 0.05;
      rule = `Round down to 5 (last digit is ${lastDigit})`;
    } else {
      result = rounded;
      rule = 'Fallback (no rule matched)';
    }
    
    console.log('[Step 5] Rule applied:', rule);
    console.log('[Result] Final rounded value:', result);
    console.groupEnd();
    
    return result;
  }

  // Get Entry Point Range Addition based on Future Close Price
  getEntryPointRangeAddition(futureClosePrice: number): number {
    console.group('[Stock Tab] Entry Point Range Addition Lookup');
    console.log('[Step 1] Input Future Close Price:', futureClosePrice);
    
    let addition: number;
    let range: string;
    
    if (futureClosePrice >= 1 && futureClosePrice <= 400) {
      addition = 0.40; // 0.40 paise
      range = '1 - 400';
    } else if (futureClosePrice >= 401 && futureClosePrice <= 2000) {
      addition = 0.60; // 0.60 paise
      range = '401 - 2000';
    } else if (futureClosePrice >= 2001 && futureClosePrice <= 3500) {
      addition = 1.60; // 1.60 rs
      range = '2001 - 3500';
    } else if (futureClosePrice >= 3501 && futureClosePrice <= 5500) {
      addition = 3.40; // 3.40 rs
      range = '3501 - 5500';
    } else if (futureClosePrice >= 5501 && futureClosePrice <= 10000) {
      addition = 5.80; // 5.80 rs
      range = '5501 - 10000';
    } else {
      addition = 0;
      range = 'No range matched (outside 1-10000)';
    }
    
    console.log('[Step 2] Range matched:', range);
    console.log('[Result] Addition value:', addition);
    console.groupEnd();
    
    return addition;
  }

  // Get Stop Loss Range Subtraction based on Future Close Price
  getStopLossRangeSubtraction(futureClosePrice: number): number {
    console.group('[Stock Tab] Stop Loss Range Subtraction Lookup');
    console.log('[Step 1] Input Future Close Price:', futureClosePrice);
    
    let subtraction: number;
    let range: string;
    
    if (futureClosePrice >= 1 && futureClosePrice <= 400) {
      subtraction = 1.50; // 1.50 paise
      range = '1 - 400';
    } else if (futureClosePrice >= 401 && futureClosePrice <= 2000) {
      subtraction = 2.00; // 2 rs
      range = '401 - 2000';
    } else if (futureClosePrice >= 2001 && futureClosePrice <= 3500) {
      subtraction = 5.60; // 5.60 rs
      range = '2001 - 3500';
    } else if (futureClosePrice >= 3501 && futureClosePrice <= 5500) {
      subtraction = 7.40; // 7.40 rs
      range = '3501 - 5500';
    } else if (futureClosePrice >= 5501 && futureClosePrice <= 10000) {
      subtraction = 9.90; // 9.90 rs
      range = '5501 - 10000';
    } else {
      subtraction = 0;
      range = 'No range matched (outside 1-10000)';
    }
    
    console.log('[Step 2] Range matched:', range);
    console.log('[Result] Subtraction value:', subtraction);
    console.groupEnd();
    
    return subtraction;
  }

  // Calculate Stock Entry Point
  calculateStockEntryPoint(camarillaPP: number, camarillaR1: number, futureClosePrice: number): number {
    console.group('[Stock Tab] Entry Point Calculation');
    console.log('[Step 1] Input values:', { camarillaPP, camarillaR1, futureClosePrice });
    
    // Calculate midpoint
    const midpoint = (camarillaPP + camarillaR1) / 2;
    console.log('[Step 2] Entry Midpoint:', midpoint, `((PP + R1) / 2: (${camarillaPP} + ${camarillaR1}) / 2)`);
    
    // Get range addition based on Future Close Price
    const addition = this.getEntryPointRangeAddition(futureClosePrice);
    console.log('[Step 3] Range addition (based on Future Close Price):', addition);
    
    // Add midpoint and addition first (before rounding)
    const sum = midpoint + addition;
    console.log('[Step 4] Sum (Midpoint + Addition):', sum, `(${midpoint} + ${addition})`);
    
    // Round the final result
    const entryPoint = this.roundEntryPoint(sum);
    console.log('[Step 5] Final Entry Point (rounded):', entryPoint);
    console.groupEnd();
    
    return entryPoint;
  }

  // Calculate NIFTY Stop Loss (using Classic PP and R1)
  calculateNiftyStopLoss(classicPP: number, classicR1: number): number {
    console.group('[NIFTY Tab] Stop Loss Calculation');
    console.log('[Step 1] Input values:', { classicPP, classicR1 });
    
    // Calculate midpoint
    const midpoint = (classicPP + classicR1) / 2;
    console.log('[Step 2] Stop Loss Midpoint:', midpoint, `((PP + R1) / 2: (${classicPP} + ${classicR1}) / 2)`);
    
    // Round midpoint
    const rounded = this.roundStopLoss(midpoint);
    console.log('[Step 3] Rounded midpoint:', rounded);
    
    // Get range subtraction
    const subtraction = this.getStopLossRangeSubtraction(rounded);
    console.log('[Step 4] Range subtraction:', subtraction);
    
    // Final stop loss
    const stopLoss = rounded - subtraction;
    console.log('[Step 5] Final Stop Loss:', stopLoss, `(Rounded - Subtraction: ${rounded} - ${subtraction})`);
    console.groupEnd();
    
    return stopLoss;
  }

  // Calculate Stock Options Stop Loss (using Classic PP and S1)
  calculateStockStopLoss(classicPP: number, classicS1: number, futureClosePrice: number): number {
    console.group('[Stock Tab] Stop Loss Calculation');
    console.log('[Step 1] Input values:', { classicPP, classicS1, futureClosePrice });
    
    // Calculate midpoint
    const midpoint = (classicPP + classicS1) / 2;
    console.log('[Step 2] Stop Loss Midpoint:', midpoint, `((PP + S1) / 2: (${classicPP} + ${classicS1}) / 2)`);
    
    // Round midpoint
    const rounded = this.roundStopLoss(midpoint);
    console.log('[Step 3] Rounded midpoint:', rounded);
    
    // Get range subtraction based on Future Close Price
    const subtraction = this.getStopLossRangeSubtraction(futureClosePrice);
    console.log('[Step 4] Range subtraction (based on Future Close Price):', subtraction);
    
    // Final stop loss
    const stopLoss = rounded - subtraction;
    console.log('[Step 5] Final Stop Loss:', stopLoss, `(Rounded - Subtraction: ${rounded} - ${subtraction})`);
    console.groupEnd();
    
    return stopLoss;
  }

  calculatePivotPoints() {
    // Step 1: Parse input values
    console.group('[Stock Tab] Input Parsing');
    const rawOpen = this.calculatorForm.get('open')?.value;
    const rawHigh = this.calculatorForm.get('high')?.value;
    const rawLow = this.calculatorForm.get('low')?.value;
    const rawLast = this.calculatorForm.get('last')?.value;
    const rawFutureClosePrice = this.calculatorForm.get('futureClosePrice')?.value;
    console.log('[Input] Raw values:', { open: rawOpen, high: rawHigh, low: rawLow, last: rawLast, futureClosePrice: rawFutureClosePrice });
    
    const open = parseFloat(rawOpen) || 0;
    const high = parseFloat(rawHigh) || 0;
    const low = parseFloat(rawLow) || 0;
    const last = parseFloat(rawLast) || 0;
    const futureClosePrice = parseFloat(rawFutureClosePrice) || 0;
    console.log('[Input] Parsed float values:', { open, high, low, last, futureClosePrice });
    console.log('[Input] Selected segment:', this.selectedSegment);
    console.groupEnd();

    if (this.selectedSegment === 'nifty') {
      // NIFTY-specific calculations using Camarilla for Entry/Stop Loss and Classic for Targets
      
      // Calculate Camarilla pivot points for Entry/Stop Loss
      const camarilla = this.calculateCamarillaPivotPoints(high, low, last);
      
      // Calculate Entry Point and Stop Loss
      const { entryPoint, stopLoss } = this.calculateNiftyEntryStopLoss(
        camarilla.pp,
        camarilla.r1,
        camarilla.s1
      );
      
      // Calculate Classic pivot points for Targets
      // IMPORTANT: Switch to Classic method for target calculations
      // Calculate R1 and R2 using Classic formulas:
      // R1 = 2 × PP - LOW
      // R2 = PP + (HIGH - LOW)
      const classic = this.calculateClassicPivotPoints(high, low, last);
      
      // Calculate Targets using Classic PP, R1 and R2; then drop/relabel/fill vs entry when needed
      const targetsRaw = this.calculateNiftyTargets(classic.pp, classic.r1, classic.r2);
      const targets = this.finalizeTargetsAgainstEntry(entryPoint, classic, targetsRaw, {
        roundLevel: (n) => this.roundDown(n),
        step: 16,
        logLabel: 'NIFTY Tab',
      });

      console.log('[NIFTY Tab] Final Results:', {
        entryPoint: entryPoint,
        stopLoss: stopLoss,
        targetOne: targets.targetOneRounded,
        targetTwo: targets.targetTwoRounded,
        targetThree: targets.targetThreeRounded,
        targetFour: targets.targetFourRounded,
        targetFive: targets.targetFiveRounded
      });
      // Set NIFTY results
      this.pivotResults.entryPoint = entryPoint;
      this.pivotResults.stopLoss = stopLoss;
      this.pivotResults.targetOne = targets.targetOneRounded;
      this.pivotResults.targetTwo = targets.targetTwoRounded;
      this.pivotResults.targetThree = targets.targetThreeRounded;
      this.pivotResults.targetFour = targets.targetFourRounded;
      this.pivotResults.targetFive = targets.targetFiveRounded;

    } else if (this.selectedSegment === 'stock') {
      console.group('[Stock Tab] Main Calculation Flow');
      console.log('[Stock Tab] Starting Stock Options calculations...');
      
      // Validate Future Close Price is provided
      if (!futureClosePrice || futureClosePrice <= 0) {
        console.error('[Stock Tab] Future Close Price is required for Stock Options calculations');
        console.groupEnd();
        return; // Exit early if Future Close Price is not provided
      }
      
      // Stock Options: Camarilla for Entry, Classic for Stop Loss and target ladder (+ finalize vs entry)
      
      // Calculate Camarilla pivot points for Entry Point
      const camarilla = this.calculateCamarillaPivotPoints(high, low, last);
      
      // Calculate Classic pivot points for Stop Loss and targets
      const classic = this.calculateClassicPivotPoints(high, low, last);
      
      // Calculate Entry Point (Camarilla) - uses Future Close Price for range lookup
      const entryPoint = this.calculateStockEntryPoint(camarilla.pp, camarilla.r1, futureClosePrice);
      
      // Calculate Stop Loss (Classic) - uses PP and S1, Future Close Price for range lookup
      const stopLoss = this.calculateStockStopLoss(classic.pp, classic.s1, futureClosePrice);
      
      const targetsRaw = this.calculateStockTargetsFromClassic(
        classic.pp,
        classic.r1,
        classic.r2,
        classic.r3
      );
      const targets = this.finalizeTargetsAgainstEntry(entryPoint, classic, targetsRaw, {
        roundLevel: (n) => this.roundStockTargetToNickel(n),
        step: 16,
        logLabel: 'Stock Tab',
      });

      // Set Stock results
      this.pivotResults.entryPoint = entryPoint;
      this.pivotResults.stopLoss = stopLoss;
      this.pivotResults.targetOne = targets.targetOneRounded;
      this.pivotResults.targetTwo = targets.targetTwoRounded;
      this.pivotResults.targetThree = targets.targetThreeRounded;
      this.pivotResults.targetFour = targets.targetFourRounded;
      this.pivotResults.targetFive = targets.targetFiveRounded;
      
      console.log('[Stock Tab] Final Results:', {
        entryPoint: this.pivotResults.entryPoint,
        stopLoss: this.pivotResults.stopLoss,
        targetOne: this.pivotResults.targetOne,
        targetTwo: this.pivotResults.targetTwo,
        targetThree: this.pivotResults.targetThree,
        targetFour: this.pivotResults.targetFour,
        targetFive: this.pivotResults.targetFive
      });
      console.log('[Stock Tab] Calculations completed successfully!');
      console.groupEnd();
    }
  }

  onViewMagic() {
    if (this.calculatorForm.valid) {
      const values = this.calculatorForm.value;
      console.log('View Magic clicked with values:', values);
      
      // Calculate pivot points
      this.calculatePivotPoints();
      
      // Show results
      this.showResults = true;
      
      // Smooth scroll to results after a short delay
      setTimeout(() => {
        const resultsElement = document.querySelector('.results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }

  navigateToNotifications() {
    this.router.navigate(['/notifications']);
  }

  navigateToBlocked() {
    this.router.navigate(['/blocked']);
  }
}
