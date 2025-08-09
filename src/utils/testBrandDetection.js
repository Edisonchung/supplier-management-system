// src/utils/testBrandDetection.js
import { ProductEnrichmentService } from '../services/ProductEnrichmentService';
import { BRAND_PATTERNS } from './productConstants';

export class BrandDetectionTester {
  
  /**
   * Comprehensive test suite for brand detection
   */
  static runComprehensiveTests() {
    console.log('🧪 Starting Comprehensive Brand Detection Tests...');
    console.log('=' .repeat(60));
    
    // Test cases organized by manufacturer
    const testCases = this.getTestCases();
    
    let totalTests = 0;
    let passedTests = 0;
    const results = {};
    
    for (const [brand, testData] of Object.entries(testCases)) {
      console.log(`\n🔧 Testing ${brand}:`);
      console.log('-'.repeat(30));
      
      const brandResults = {
        total: testData.parts.length,
        passed: 0,
        failed: 0,
        details: []
      };
      
      for (const testCase of testData.parts) {
        totalTests++;
        
        const result = ProductEnrichmentService.detectBrandFromPartNumber(
          testCase.partNumber,
          testCase.description || ''
        );
        
        const expectedBrand = testCase.expectedBrand || brand;
        const isCorrect = result && result.brand === expectedBrand;
        
        if (isCorrect) {
          passedTests++;
          brandResults.passed++;
          console.log(`  ✅ ${testCase.partNumber} → ${result.brand} (${Math.round(result.confidence * 100)}%)`);
        } else {
          brandResults.failed++;
          const detectedBrand = result ? result.brand : 'Unknown';
          console.log(`  ❌ ${testCase.partNumber} → Expected: ${expectedBrand}, Got: ${detectedBrand}`);
        }
        
        brandResults.details.push({
          partNumber: testCase.partNumber,
          expected: expectedBrand,
          detected: result?.brand || 'Unknown',
          confidence: result?.confidence || 0,
          category: result?.category || 'unknown',
          passed: isCorrect
        });
      }
      
      results[brand] = brandResults;
      console.log(`  📊 ${brand}: ${brandResults.passed}/${brandResults.total} passed (${Math.round(brandResults.passed/brandResults.total * 100)}%)`);
    }
    
    // Overall results
    console.log('\n' + '='.repeat(60));
    console.log('📈 OVERALL RESULTS:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round(passedTests/totalTests * 100)}%`);
    
    return {
      totalTests,
      passedTests,
      successRate: passedTests/totalTests,
      brandResults: results
    };
  }

  /**
   * Test cases for different manufacturers
   */
  static getTestCases() {
    return {
      'Siemens': {
        description: 'German industrial automation and digitalization company',
        parts: [
          { partNumber: '6ES7407-0KA02-0AA0', description: 'SIMATIC S7-400 Power Supply' },
          { partNumber: '3SE5162-0UB01-1AM4', description: 'Position Switch' },
          { partNumber: '1LA7096-4AA10', description: 'Motor' },
          { partNumber: '7ML5221-1BA11', description: 'Pressure Transmitter' },
          { partNumber: '5SY4116-7', description: 'Circuit Breaker' },
          { partNumber: '6ES7315-2EH14-0AB0', description: 'SIMATIC S7-300 CPU' },
          { partNumber: '3TK2804-1BB40', description: 'Safety Relay' },
          { partNumber: '1FK7042-5AF71-1SG0', description: 'Servo Motor' }
        ]
      },
      
      'SKF': {
        description: 'Swedish bearing and seal manufacturing company',
        parts: [
          { partNumber: '6309-2Z', description: 'Deep groove ball bearing' },
          { partNumber: '32222', description: 'Tapered roller bearing' },
          { partNumber: 'NJ2214ECP', description: 'Cylindrical roller bearing' },
          { partNumber: 'NU2216ECP', description: 'Cylindrical roller bearing' },
          { partNumber: '51110', description: 'Thrust ball bearing' },
          { partNumber: 'HM89449/10', description: 'Tapered roller bearing' },
          { partNumber: 'GE25ES', description: 'Spherical plain bearing' },
          { partNumber: 'UCFL208', description: 'Pillow block bearing' }
        ]
      },
      
      'ABB': {
        description: 'Swiss-Swedish multinational corporation',
        parts: [
          { partNumber: 'ACS880-01-144A-3', description: 'Variable Frequency Drive' },
          { partNumber: 'AF09-30-10-13', description: 'Contactor' },
          { partNumber: 'IRB6640', description: 'Industrial Robot' },
          { partNumber: 'DSQC679', description: 'Robot Controller Board' },
          { partNumber: 'OT30F3', description: 'Disconnect Switch' },
          { partNumber: 'ACS550-01-038A-4', description: 'AC Drive' },
          { partNumber: 'AF16-30-10-13', description: 'Contactor' }
        ]
      },
      
      'Schneider Electric': {
        description: 'French multinational corporation',
        parts: [
          { partNumber: 'TM241C24T', description: 'PLC Controller' },
          { partNumber: 'LC1D18M7', description: 'Contactor' },
          { partNumber: 'XPSMC32ZC', description: 'Safety Controller' },
          { partNumber: 'VW3A3201', description: 'Drive Accessory' },
          { partNumber: 'BMXCPS2000', description: 'Power Supply' },
          { partNumber: 'XS630B1PAL2', description: 'Inductive Sensor' }
        ]
      },
      
      'Festo': {
        description: 'German automation company specializing in pneumatic and electrical automation technology',
        parts: [
          { partNumber: 'DSBC-63-125-PPVA-N3', description: 'Pneumatic Cylinder' },
          { partNumber: 'CPE14-M1BH-5L-1/8', description: 'Solenoid Valve' },
          { partNumber: 'SIEN-M12B-PS-S-L', description: 'Proximity Sensor' },
          { partNumber: 'MSN1H-1/2-FRC-C', description: 'Silencer' },
          { partNumber: 'VMPA1-M1H-L-PI', description: 'Valve Terminal' }
        ]
      },
      
      'Allen-Bradley': {
        description: 'American brand of factory automation equipment',
        parts: [
          { partNumber: '1756-L73', description: 'ControlLogix Processor' },
          { partNumber: '440R-C23138', description: 'Safety Relay' },
          { partNumber: '2097-V34PR6-LM', description: 'Servo Drive' },
          { partNumber: '1794-IE8', description: 'Analog Input Module' },
          { partNumber: '800F-N3', description: 'Push Button' }
        ]
      }
    };
  }

  /**
   * Test individual part number with detailed analysis
   */
  static testIndividualPart(partNumber, description = '', expectedBrand = null) {
    console.log(`\n🔍 Detailed Analysis for: ${partNumber}`);
    console.log('='.repeat(50));
    
    // Test with ProductEnrichmentService
    const result = ProductEnrichmentService.detectBrandFromPartNumber(partNumber, description);
    
    if (result) {
      console.log(`✅ Brand Detected: ${result.brand}`);
      console.log(`📊 Confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`📂 Category: ${result.category}`);
      
      if (expectedBrand) {
        const isCorrect = result.brand === expectedBrand;
        console.log(`🎯 Expected: ${expectedBrand} → ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
      }
    } else {
      console.log(`❌ No brand detected`);
      if (expectedBrand) {
        console.log(`🎯 Expected: ${expectedBrand} → MISSED`);
      }
    }
    
    // Test pattern matching details
    console.log('\n🔬 Pattern Analysis:');
    this.analyzePatternMatching(partNumber, description);
    
    return result;
  }

  /**
   * Analyze which patterns are being matched
   */
  static analyzePatternMatching(partNumber, description) {
    const cleanPartNumber = partNumber.trim().toUpperCase();
    const combinedText = `${partNumber} ${description}`.toUpperCase();
    
    let foundMatches = false;
    
    for (const [brandName, brandConfig] of Object.entries(BRAND_PATTERNS)) {
      const patterns = brandConfig.patterns || [];
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        
        try {
          if (pattern.test(cleanPartNumber)) {
            console.log(`  ✅ ${brandName} Pattern ${i + 1}: ${pattern} (Part Number Match)`);
            foundMatches = true;
          } else if (pattern.test(combinedText)) {
            console.log(`  🔍 ${brandName} Pattern ${i + 1}: ${pattern} (Description Match)`);
            foundMatches = true;
          }
        } catch (error) {
          console.log(`  ❌ ${brandName} Pattern ${i + 1}: Invalid pattern - ${error.message}`);
        }
      }
    }
    
    if (!foundMatches) {
      console.log('  ❌ No patterns matched');
    }
  }

  /**
   * Test part number validation
   */
  static testPartNumberValidation() {
    console.log('\n🧪 Testing Part Number Validation:');
    console.log('='.repeat(40));
    
    const testCases = [
      { input: '6ES7407-0KA02-0AA0', shouldBeValid: true },
      { input: 'SKU123456', shouldBeValid: true },
      { input: 'P/N: 6ES7407-0KA02-0AA0', shouldBeValid: true },
      { input: 'PART 123-ABC', shouldBeValid: true },
      { input: '', shouldBeValid: false },
      { input: '   ', shouldBeValid: false },
      { input: 'AB', shouldBeValid: false },
      { input: '123@#$%', shouldBeValid: false }
    ];
    
    let passed = 0;
    let total = testCases.length;
    
    for (const testCase of testCases) {
      const result = ProductEnrichmentService.validateAndNormalizePartNumber(testCase.input);
      const isCorrect = result.isValid === testCase.shouldBeValid;
      
      console.log(`${isCorrect ? '✅' : '❌'} "${testCase.input}" → ${result.isValid ? 'Valid' : 'Invalid'} ${result.normalized ? `(${result.normalized})` : ''}`);
      
      if (isCorrect) passed++;
    }
    
    console.log(`\n📊 Validation Tests: ${passed}/${total} passed (${Math.round(passed/total * 100)}%)`);
    return { passed, total };
  }

  /**
   * Test SKU generation
   */
  static testSKUGeneration() {
    console.log('\n🧪 Testing SKU Generation:');
    console.log('='.repeat(40));
    
    const testCases = [
      { category: 'automation', brand: 'Siemens', partNumber: '6ES7407-0KA02-0AA0' },
      { category: 'bearings', brand: 'SKF', partNumber: '6309-2Z' },
      { category: 'drives', brand: 'ABB', partNumber: 'ACS880-01-144A-3' },
      { category: 'components', brand: '', partNumber: 'UNKNOWN-123' },
      { category: '', brand: 'TestBrand', partNumber: 'TEST-456' }
    ];
    
    for (const testCase of testCases) {
      const sku = ProductEnrichmentService.generateInternalSKU(testCase);
      console.log(`✅ ${JSON.stringify(testCase)} → ${sku}`);
    }
  }

  /**
   * Performance test for brand detection
   */
  static testPerformance() {
    console.log('\n⚡ Performance Testing:');
    console.log('='.repeat(40));
    
    const testParts = [
      '6ES7407-0KA02-0AA0',
      '3SE5162-0UB01-1AM4',
      '6309-2Z',
      '32222',
      'ACS880-01-144A-3',
      'AF09-30-10-13'
    ];
    
    const iterations = 1000;
    
    console.log(`Testing ${testParts.length} parts × ${iterations} iterations...`);
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      for (const partNumber of testParts) {
        ProductEnrichmentService.detectBrandFromPartNumber(partNumber);
      }
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / (testParts.length * iterations);
    
    console.log(`✅ Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`✅ Average per detection: ${averageTime.toFixed(4)}ms`);
    console.log(`✅ Detections per second: ${Math.round(1000 / averageTime).toLocaleString()}`);
    
    return {
      totalTime,
      averageTime,
      detectionsPerSecond: 1000 / averageTime
    };
  }

  /**
   * Export test results to console table
   */
  static exportResultsTable(results) {
    console.log('\n📊 DETAILED RESULTS TABLE:');
    console.log('='.repeat(80));
    
    const tableData = [];
    
    for (const [brand, brandResult] of Object.entries(results.brandResults)) {
      for (const detail of brandResult.details) {
        tableData.push({
          Brand: brand,
          'Part Number': detail.partNumber,
          Expected: detail.expected,
          Detected: detail.detected,
          'Confidence %': Math.round(detail.confidence * 100),
          Category: detail.category,
          Status: detail.passed ? '✅ PASS' : '❌ FAIL'
        });
      }
    }
    
    console.table(tableData);
  }

  /**
   * Generate missing pattern suggestions
   */
  static suggestMissingPatterns(results) {
    console.log('\n💡 PATTERN IMPROVEMENT SUGGESTIONS:');
    console.log('='.repeat(50));
    
    const failedTests = [];
    
    for (const [brand, brandResult] of Object.entries(results.brandResults)) {
      const failed = brandResult.details.filter(d => !d.passed);
      failedTests.push(...failed.map(f => ({ ...f, expectedBrand: brand })));
    }
    
    if (failedTests.length === 0) {
      console.log('🎉 All tests passed! No pattern improvements needed.');
      return;
    }
    
    console.log(`Found ${failedTests.length} failed detections. Analyzing patterns...`);
    
    // Group failed tests by expected brand
    const failedByBrand = {};
    failedTests.forEach(test => {
      if (!failedByBrand[test.expectedBrand]) {
        failedByBrand[test.expectedBrand] = [];
      }
      failedByBrand[test.expectedBrand].push(test.partNumber);
    });
    
    for (const [brand, partNumbers] of Object.entries(failedByBrand)) {
      console.log(`\n🔧 Suggested patterns for ${brand}:`);
      
      // Find common prefixes
      const prefixes = this.findCommonPrefixes(partNumbers);
      
      for (const prefix of prefixes) {
        if (prefix.length >= 3) {
          const pattern = `^${prefix.replace(/\d/g, '\\d').replace(/[.*+?^${}()|[\]\\]/g, '\\    console.log(`✅ Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`✅ Average per detection: ${averageTime.toFixed(4)}ms`);
    console.')}`;
          console.log(`  Add pattern: /${pattern}/i`);
          console.log(`  Command: ProductEnrichmentService.addBrandPattern('${brand}', '${pattern}', 'components');`);
        }
      }
    }
  }

  /**
   * Find common prefixes in part numbers
   */
  static findCommonPrefixes(partNumbers) {
    const prefixes = new Set();
    
    for (let i = 0; i < partNumbers.length; i++) {
      for (let j = i + 1; j < partNumbers.length; j++) {
        const prefix = this.getCommonPrefix(partNumbers[i], partNumbers[j]);
        if (prefix.length >= 3) {
          prefixes.add(prefix);
        }
      }
    }
    
    return Array.from(prefixes).sort((a, b) => b.length - a.length);
  }

  /**
   * Get common prefix between two strings
   */
  static getCommonPrefix(str1, str2) {
    let prefix = '';
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i].toLowerCase() === str2[i].toLowerCase()) {
        prefix += str1[i];
      } else {
        break;
      }
    }
    
    return prefix;
  }

  /**
   * Test with user's actual part numbers
   */
  static testUserPartNumbers(userPartNumbers = []) {
    if (userPartNumbers.length === 0) {
      console.log('\n📝 To test your actual part numbers, call:');
      console.log('BrandDetectionTester.testUserPartNumbers([');
      console.log('  "YOUR-PART-1",');
      console.log('  "YOUR-PART-2",');
      console.log('  "YOUR-PART-3"');
      console.log(']);');
      return;
    }
    
    console.log('\n🏭 Testing User Part Numbers:');
    console.log('='.repeat(40));
    
    const results = [];
    
    for (const partNumber of userPartNumbers) {
      const result = ProductEnrichmentService.detectBrandFromPartNumber(partNumber);
      
      if (result) {
        console.log(`✅ ${partNumber} → ${result.brand} (${Math.round(result.confidence * 100)}%, ${result.category})`);
        results.push({ partNumber, ...result, detected: true });
      } else {
        console.log(`❌ ${partNumber} → Unknown`);
        results.push({ partNumber, detected: false });
      }
    }
    
    const detectionRate = results.filter(r => r.detected).length / results.length;
    console.log(`\n📊 Detection Rate: ${Math.round(detectionRate * 100)}% (${results.filter(r => r.detected).length}/${results.length})`);
    
    // Suggest improvements for unknown parts
    const unknownParts = results.filter(r => !r.detected).map(r => r.partNumber);
    if (unknownParts.length > 0) {
      console.log('\n💡 Unknown parts that need pattern additions:');
      unknownParts.forEach(part => {
        console.log(`  📝 ${part} - Add pattern with: addBrandPattern('YourBrand', '^${part.slice(0, 4)}', 'category')`);
      });
    }
    
    return results;
  }

  /**
   * Interactive testing mode
   */
  static startInteractiveMode() {
    console.log('\n🎮 Interactive Brand Detection Mode');
    console.log('='.repeat(40));
    console.log('Commands:');
    console.log('  test("PART-NUMBER") - Test a part number');
    console.log('  addPattern("Brand", "pattern", "category") - Add new pattern');
    console.log('  runAll() - Run all tests');
    console.log('  help() - Show this help');
    console.log('  exit() - Exit interactive mode');
    console.log('\nExample: test("6ES7407-0KA02-0AA0")');
    
    // Make functions available globally for console access
    window.test = (partNumber, description = '') => {
      return this.testIndividualPart(partNumber, description);
    };
    
    window.addPattern = (brand, pattern, category = 'components') => {
      ProductEnrichmentService.addBrandPattern(brand, pattern, category);
      console.log(`✅ Pattern added for ${brand}: ${pattern}`);
    };
    
    window.runAll = () => {
      return this.runComprehensiveTests();
    };
    
    window.help = () => {
      this.startInteractiveMode();
    };
    
    window.exit = () => {
      delete window.test;
      delete window.addPattern;
      delete window.runAll;
      delete window.help;
      delete window.exit;
      console.log('👋 Exited interactive mode');
    };
    
    console.log('\n✅ Interactive mode ready! Try: test("6ES7407-0KA02-0AA0")');
  }
}

// Usage examples and documentation
export const testBrandDetection = () => {
  console.log('🚀 Starting Brand Detection Test Suite...\n');
  
  // Run comprehensive tests
  const results = BrandDetectionTester.runComprehensiveTests();
  
  // Test part number validation
  BrandDetectionTester.testPartNumberValidation();
  
  // Test SKU generation
  BrandDetectionTester.testSKUGeneration();
  
  // Performance test
  BrandDetectionTester.testPerformance();
  
  // Export detailed results
  BrandDetectionTester.exportResultsTable(results);
  
  // Suggest pattern improvements
  BrandDetectionTester.suggestMissingPatterns(results);
  
  console.log('\n🎯 Test Suite Complete!');
  console.log('To start interactive testing: BrandDetectionTester.startInteractiveMode()');
  
  return results;
};

// Export for console usage
if (typeof window !== 'undefined') {
  window.BrandDetectionTester = BrandDetectionTester;
  window.testBrandDetection = testBrandDetection;
}

export default BrandDetectionTester;
