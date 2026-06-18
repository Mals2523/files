import React, { useState } from 'react';
import Papa from 'papaparse';
import './App.css';

export default function App() {
  const [data, setData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [countryRules, setCountryRules] = useState({
    'India': 10,
    'Singapore': 8,
    'UAE': 9,
    'US': 10,
    'UK': 11
  });
  const [step, setStep] = useState('upload');
  const [selectedRow, setSelectedRow] = useState(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [newDigits, setNewDigits] = useState('');
  const [aiInsights, setAiInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [chunkSize, setChunkSize] = useState(10);

  // ===== HELPER FUNCTIONS =====

  // Validate if date is actually valid (handles leap years, month days, etc)
  const isValidDate = (dateStr) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;

    const [year, month, day] = dateStr.split('-').map(Number);

    // Check month range
    if (month < 1 || month > 12) return false;

    // Check day range based on month
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Check for leap year
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear) daysInMonth[1] = 29;

    if (day < 1 || day > daysInMonth[month - 1]) return false;

    return true;
  };

  const paymentModes = {};

validationResults.forEach(row => {
  if (row.payment_mode) {
    paymentModes[row.payment_mode] =
      (paymentModes[row.payment_mode] || 0) + 1;
  }
});

  // Get quality score badge
  const getQualityBadge = (score) => {
    if (score >= 90) return { emoji: '🟢', label: 'Excellent', color: '#10b981' };
    if (score >= 60) return { emoji: '🟡', label: 'Fair', color: '#f59e0b' };
    return { emoji: '🔴', label: 'Poor', color: '#ef4444' };
  };

  // Get suggested fix for error
  const getSuggestedFix = (error) => {
    if (error.includes('Invalid phone')) {
      const country = error.match(/for (\w+)/)?.[1];
      if (country) {
        const digits = countryRules[country];
        return `${country} phone numbers must contain exactly ${digits} digits`;
      }
    }
    if (error.includes('Invalid date')) return 'Use YYYY-MM-DD format with valid dates';
    if (error.includes('Negative amount')) return 'Amount must be greater than 0';
    if (error.includes('Invalid payment_mode')) return 'Use: Card, UPI, Cash, Cheque, or Bank Transfer';
    if (error.includes('Missing')) return `This field is required for transaction processing`;
    if (error.includes('Duplicate')) return 'Remove duplicate order to proceed';
    return 'Please fix this field';
  };

  // ===== FILE HANDLERS =====

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const filteredData = results.data.filter(row =>
            Object.values(row).some(v => v)
          );
          setData(filteredData);
          setStep('config');
        }
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.background = '#eff6ff';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.style.background = 'white';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.background = 'white';
    const file = e.dataTransfer.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const filteredData = results.data.filter(row =>
            Object.values(row).some(v => v)
          );
          setData(filteredData);
          setStep('config');
        }
      });
    }
  };

  // ===== VALIDATION ENGINE =====

  const validateData = () => {
    const results = [];
    const orderIds = {};
    
    // First pass: detect duplicates
    data.forEach((row) => {
      if (row.order_id) {
        if (!orderIds[row.order_id]) {
          orderIds[row.order_id] = [];
        }
        orderIds[row.order_id].push(row);
      }
    });

    const duplicateOrderIds = Object.keys(orderIds).filter(id => orderIds[id].length > 1);

    // Second pass: validate all rows
    data.forEach((row, idx) => {
      const errors = [];

      // ===== PHONE VALIDATION =====
      if (row.phone) {
        const country = row.country || 'India';
        const expectedDigits = countryRules[country];
        if (expectedDigits) {
          const digitsOnly = row.phone.toString().replace(/\D/g, '');
          if (digitsOnly.length !== expectedDigits) {
            errors.push(`Invalid phone for ${country} (expected ${expectedDigits} digits, got ${digitsOnly.length})`);
          }
        } else {
          errors.push(`Unknown country: ${country}`);
        }
      } else {
        errors.push('Missing phone');
      }

      // ===== DATE VALIDATION =====
      if (row.transaction_date) {
        if (!isValidDate(row.transaction_date)) {
          errors.push('Invalid date');
        }
      } else {
        errors.push('Missing transaction_date');
      }

      // ===== AMOUNT VALIDATION =====
      if (row.amount) {
        const amount = parseFloat(row.amount);
        if (isNaN(amount)) {
          errors.push('Invalid amount (not numeric)');
        } else if (amount <= 0) {
          errors.push('Negative amount');
        }
      } else {
        errors.push('Missing amount');
      }

      // ===== REQUIRED FIELDS =====
      if (!row.order_id) errors.push('Missing order_id');
      if (!row.product_name) errors.push('Missing product_name');
      if (!row.payment_mode) errors.push('Missing payment_mode');
      if (!row.country) errors.push('Missing country');

      // ===== PAYMENT MODE VALIDATION =====
      const validPaymentModes = ['Card', 'UPI', 'Cash', 'Cheque', 'Bank Transfer'];
      if (row.payment_mode && !validPaymentModes.includes(row.payment_mode)) {
        errors.push(`Invalid payment_mode: ${row.payment_mode}`);
      }

      // ===== DUPLICATE DETECTION =====
      if (row.order_id && duplicateOrderIds.includes(row.order_id)) {
        errors.push('Duplicate order_id');
      }

      results.push({
        row: idx + 1,
        ...row,
        errors,
        isValid: errors.length === 0
      });
    });

    setValidationResults(results);
    setStep('dashboard');
    generateInsights(results);
  };

  // ===== AI INSIGHTS GENERATION =====

  const generateInsights = async (results) => {
    setLoadingInsights(true);
    const total = results.length;
    const valid = results.filter(r => r.isValid).length;
    const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);

    const errorTypes = {};
    let duplicateCount = 0;
    let invalidDateCount = 0;

    results.forEach(r => {
      r.errors.forEach(err => {
        if (err.includes('Duplicate')) {
          duplicateCount += 1;
        } else if (err.includes('Invalid date')) {
          invalidDateCount += 1;
        } else {
          const key = err.split('(')[0].trim();
          errorTypes[key] = (errorTypes[key] || 0) + 1;
        }
      });
    });

    // Find most common error
    const mostCommonError = Object.entries(errorTypes).sort((a, b) => b[1] - a[1])[0];

    const summary = {
      totalRows: total,
      validRows: valid,
      errorCount,
      quality: Math.round((valid / total) * 100),
      errorBreakdown: errorTypes,
      duplicateOrderIds: duplicateCount,
      invalidDates: invalidDateCount,
      mostCommonError: mostCommonError ? `${mostCommonError[0]}: ${mostCommonError[1]}` : 'None'
    };

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `You are a data quality analyst. Analyze this transaction validation summary and provide actionable insights in exactly 200 words.

Format your response as:

**Dataset Quality:** [score]% - [Fair/Good/Excellent]

**Key Issues Found:**
• [Issue 1 with count]
• [Issue 2 with count]
• [Issue 3 with count]

**Impact Analysis:**
[1-2 sentences about data usability]

**Recommendations:**
• [Specific action 1]
• [Specific action 2]
• [Specific action 3]

Data: ${JSON.stringify(summary)}`
          }]
        })
      });

      const respData = await response.json();
      const text = respData.content[0].text;
      setAiInsights(text);
    } catch (error) {
      const fallback = `**Dataset Quality:** ${summary.quality}% - ${summary.quality >= 80 ? 'Good' : summary.quality >= 60 ? 'Fair' : 'Poor'}

**Key Issues Found:**
${duplicateCount > 0 ? `• Duplicate order IDs: ${duplicateCount}\n` : ''}${invalidDateCount > 0 ? `• Invalid dates: ${invalidDateCount}\n` : ''}${Object.entries(errorTypes).slice(0, 2).map(([k, v]) => `• ${k}: ${v}`).join('\n')}

**Impact Analysis:**
${summary.quality >= 80 ? 'Most transactions are valid and ready for processing.' : 'Significant data quality issues need resolution before processing.'}

**Recommendations:**
• Fix ${summary.quality < 80 ? 'critical' : 'remaining'} validation errors
• Remove duplicate transactions
• Standardize date and phone formats`;
      setAiInsights(fallback);
    }
    setLoadingInsights(false);
  };

  // ===== EXPORT FUNCTIONS =====

  const downloadCleanedCSV = () => {
    const cleaned = validationResults.filter(r => r.isValid);
    if (cleaned.length === 0) {
      alert(`⚠️ No valid rows found!\n\nAll ${validationResults.length} rows have errors.\n\nFix the issues in your CSV and re-upload.`);
      return;
    }
    const headers = Object.keys(cleaned[0]).filter(
      k => k !== 'errors' && k !== 'isValid' && k !== 'row'
    );
    const csv = [
      headers.join(','),
      ...cleaned.map(r => headers.map(h => `"${r[h] || ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_data.csv';
    a.click();
  };

  const downloadChunkedCSVs = () => {
    const cleaned = validationResults.filter(r => r.isValid);
    if (cleaned.length === 0) {
      alert('No valid rows to export');
      return;
    }
  const headers = Object.keys(cleaned[0]).filter(
      k => k !== 'errors' && k !== 'isValid' && k !== 'row'
    );

    // Generate chunks
    for (let i = 0; i < cleaned.length; i += parseInt(chunkSize)) {
      const chunk = cleaned.slice(i, i + parseInt(chunkSize));
      const chunkNum = Math.floor(i / parseInt(chunkSize)) + 1;
      
      const csv = [
        headers.join(','),
        ...chunk.map(r => headers.map(h => `"${r[h] || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chunk_${chunkNum}.csv`;
      a.click();
    }
  };

  const downloadValidationReport = () => {
  const total = validationResults.length;
  const valid = validationResults.filter(r => r.isValid).length;
  const quality = total > 0
    ? Math.round((valid / total) * 100)
    : 0;

  const report = `
XENO DATA VALIDATION REPORT
===========================

Generated On:
${new Date().toLocaleString()}

SUMMARY
--------
Total Rows: ${total}
Valid Rows: ${valid}
Invalid Rows: ${total - valid}
Quality Score: ${quality}%

ERROR BREAKDOWN
---------------
${Object.entries(errorTypes)
  .map(([type, count]) => `${type}: ${count}`)
  .join('\n')}

${duplicateCount > 0 ? `Duplicate IDs: ${duplicateCount}` : ''}

AI INSIGHTS
-----------
${aiInsights || 'No AI insights available'}

RECOMMENDATIONS
---------------
• Fix validation errors
• Remove duplicate records
• Standardize phone and date formats
• Re-upload cleaned dataset
`;

  const blob = new Blob(
    [report],
    { type: 'text/plain' }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;
  a.download = 'validation_report.txt';
  a.click();
};

  const downloadSampleCSV = () => {
    const sampleData = [
      ['order_id', 'product_name', 'phone', 'country', 'payment_mode', 'transaction_date', 'amount'],
      ['ORD001', 'iPhone 15', '9876543210', 'India', 'Card', '2025-06-01', '79999'],
      ['ORD002', 'Samsung S24', '9123456789', 'India', 'UPI', '2025-06-02', '69999'],
      ['ORD003', 'AirPods Pro', '12345', 'India', 'Cash', '2025-06-03', '24999'],
      ['ORD004', 'MacBook Air', '87654321', 'Singapore', 'Card', '2025-06-04', '99999'],
      ['ORD005', 'Apple Watch', '9876543210', 'India', '', '2025-06-05', '29999'],
      ['ORD006', 'Dell XPS', '9123456789', 'India', 'UPI', '2025-02-30', '89999'],
      ['ORD007', 'Monitor', '12345678', 'Singapore', 'Card', '2025-06-07', '-5000'],
      ['ORD008', 'Keyboard', '87654321', 'Singapore', 'Cash', '2025-06-08', '4999'],
      ['ORD009', 'Mouse', '9876543210', 'India', 'UPI', '2025-06-09', '999'],
      ['ORD009', 'USB Hub', '9876543210', 'India', 'Card', '2025-06-10', '599']
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_transaction_data.csv';
    a.click();
  };

  const reset = () => {
    setData([]);
    setValidationResults([]);
    setStep('upload');
    setSelectedRow(null);
    setAiInsights('');
  };

  // ===== RULE MANAGEMENT =====

  const addCountryRule = () => {
    if (newCountry && newDigits) {
      setCountryRules(prev => ({
        ...prev,
        [newCountry]: parseInt(newDigits)
      }));
      setNewCountry('');
      setNewDigits('');
      setShowAddRule(false);
    }
  };

  const deleteCountryRule = (country) => {
    setCountryRules(prev => {
      const updated = { ...prev };
      delete updated[country];
      return updated;
    });
  };

  // ===== CALCULATIONS =====

  const total = validationResults.length;
  const valid = validationResults.filter(r => r.isValid).length;
  const errorCount = validationResults.reduce((sum, r) => sum + r.errors.length, 0);
  const quality = total > 0 ? Math.round((valid / total) * 100) : 0;
  const badge = getQualityBadge(quality);

  const errorTypes = {};
  let duplicateCount = 0;
  validationResults.forEach(r => {
    r.errors.forEach(err => {
      if (err.includes('Duplicate')) {
        duplicateCount += 1;
      } else {
        const key = err.split('(')[0].trim();
        errorTypes[key] = (errorTypes[key] || 0) + 1;
      }
    });
  });

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>💙 Xeno Data Validator</h1>
          <p>Enterprise-grade transaction validation & processing platform</p>
        </div>
      </header>

      <main className="container">
        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="section">
            <h2 className="section-title">Upload CSV File</h2>
            <div
              className="upload-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
              <p className="upload-text">
                <strong>Drag & drop</strong> your CSV here or <strong>click to browse</strong>
              </p>
              <input
                id="fileInput"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
            <button
              className="btn btn-secondary"
              onClick={downloadSampleCSV}
              style={{ marginTop: '12px' }}
            >
              📥 Download Sample CSV
            </button>
          </div>
        )}

        {/* STEP 2: CONFIGURATION */}
        {step === 'config' && (
          <div className="section">
            <h2 className="section-title">Validation Rules Configuration</h2>
            <h3 className="subsection-title">Country Phone Validation Rules</h3>
            <div className="rules-grid">
              {Object.entries(countryRules).map(([country, digits]) => (
                <div key={country} className="rule-card">
                  <div className="rule-header">
                    <span className="rule-name">{country}</span>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteCountryRule(country)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="rule-value">{digits} digits</div>
                </div>
              ))}
            </div>

            <div className="controls">
              <button className="btn btn-primary" onClick={() => setShowAddRule(!showAddRule)}>
                + Add Country
              </button>
            </div>

            {showAddRule && (
              <div className="add-rule-form">
                <input
                  type="text"
                  placeholder="Country name"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Phone digits"
                  min="1"
                  max="20"
                  value={newDigits}
                  onChange={(e) => setNewDigits(e.target.value)}
                />
                <button className="btn btn-primary" onClick={addCountryRule}>
                  Add
                </button>
                <button className="btn btn-secondary" onClick={() => setShowAddRule(false)}>
                  Cancel
                </button>
              </div>
            )}

            <div className="controls" style={{ marginTop: '24px' }}>
              <button className="btn btn-success" onClick={validateData}>
                ▶️ Run Validation
              </button>
              <button className="btn btn-secondary" onClick={reset}>
                ↩️ Upload Different File
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DASHBOARD */}
        {step === 'dashboard' && (
          <>
            {/* KPI Cards with Badge */}

            

            <div className="section">
              <h2 className="section-title">Validation Results</h2>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">Total Rows</div>
                  <div className="kpi-value">{total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Valid</div>
                  <div className="kpi-value">{valid}</div>
                  <div className="kpi-subtext">{total > 0 ? Math.round((valid / total) * 100) : 0}%</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Issues Found</div>
                  <div className="kpi-value" style={{ color: '#ef4444' }}>{errorCount}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Quality Score</div>
                  <div className="quality-badge">
                    <span className="badge-emoji">{badge.emoji}</span>
                    <div>
                      <div className="badge-percentage">{quality}%</div>
                      <div className="badge-label" style={{ color: badge.color }}>
                        {badge.label}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="section">
  <h3>Payment Mode Summary</h3>

  {Object.entries(paymentModes).map(
    ([mode, count]) => (
      <div key={mode}>
        {mode}: {count}
      </div>
    )
  )}
</div>

            {/* AI Insights */}
            {(loadingInsights || aiInsights) && (
              <div className="section">
                <h3 className="section-title">AI Dataset Analysis</h3>
                {loadingInsights ? (
                  <div className="loading">
                    <div className="spinner"></div>
                    <p>Analyzing data patterns...</p>
                  </div>
                ) : (
                  <div className="insights-box">
                    {aiInsights.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Summary */}
            <div className="section">
              <h3 className="section-title">Error Summary</h3>
              <div className="error-summary">
                {duplicateCount > 0 && (
                  <div className="error-card">
                    <div className="error-label">Duplicate IDs</div>
                    <div className="error-count">{duplicateCount}</div>
                  </div>
                )}
                {Object.entries(errorTypes).map(([type, count]) => (
                  <div key={type} className="error-card">
                    <div className="error-label">{type}</div>
                    <div className="error-count">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row Inspector */}
            {selectedRow !== null && (
              <div className="section">
                <div className="inspector-panel">
                  <div className="inspector-header">
                    <span>Transaction #{selectedRow.row}</span>
                    <button
                      className="btn btn-sm"
                      onClick={() => setSelectedRow(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="inspector-content">
                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ fontSize: '14px', color: '#374151' }}>Transaction Details:</strong>
                    </div>
                    <div className="field">
                      <strong>Order ID:</strong> {selectedRow.order_id || '(missing)'}
                    </div>
                    <div className="field">
                      <strong>Product Name:</strong> {selectedRow.product_name || '(missing)'}
                    </div>
                    <div className="field">
                      <strong>Country:</strong> {selectedRow.country || '(missing)'}
                    </div>
                    <div className="field">
                      <strong>Phone:</strong> {selectedRow.phone || '(missing)'}
                    </div>
                    <div className="field">
                      <strong>Payment Mode:</strong> {selectedRow.payment_mode || '(missing)'}
                    </div>
                    <div className="field">
                      <strong>Amount:</strong> {selectedRow.amount || '(missing)'}
                    </div>
                    <div className="field">
                      <strong>Transaction Date:</strong> {selectedRow.transaction_date || '(missing)'}
                    </div>
                    
                    {selectedRow.errors.length > 0 && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #dbeafe' }}>
                        <strong style={{ fontSize: '14px', color: '#374151' }}>Validation Issues:</strong>
                        <div className="error-list" style={{ marginTop: '8px' }}>
                          {selectedRow.errors.map((err, i) => (
                            <div key={i} className="error-item">
                              <span className="error-badge">{err}</span>
                              <div className="suggestion">
                                💡 {getSuggestedFix(err)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedRow.isValid && (
                      <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '6px', color: '#166534' }}>
                        ✓ This transaction is valid and ready for processing
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="section">
              <h3 className="section-title">Data Preview (First 50 rows)</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Order ID</th>
                      <th>Product</th>
                      <th>Phone</th>
                      <th>Country</th>
                      <th>Status</th>
                      <th>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.slice(0, 50).map((row) => (
                      <tr
                        key={row.row}
                        className={`row-${row.isValid ? 'valid' : 'error'}`}
                        onClick={() => setSelectedRow(row)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{row.row}</td>
                        <td style={{ fontWeight: 500 }}>{row.order_id || '-'}</td>
                        <td>{row.product_name ? row.product_name.substring(0, 15) : '-'}</td>
                        <td>{row.phone || '-'}</td>
                        <td>{row.country || '-'}</td>
                        <td>{row.isValid ? '✓ Valid' : '✕ Error'}</td>
                        <td>{row.errors.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Section */}
            <div className="section">
              <h3 className="section-title">Export Options</h3>
              <div className="controls">
                <button className="btn btn-success" onClick={downloadCleanedCSV}>
                  📥 Download Clean CSV
                </button>
                <button className="btn btn-info" onClick={downloadChunkedCSVs}>
                  📦 Download Chunked CSVs
                </button>
                <button className="btn btn-primary"
                        onClick={downloadValidationReport}
                >
                     📄 Download Validation Report
                </button>
              </div>
              
              <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Chunk size (rows):</span>
                  <input
                    type="number"
                    min="5"
                    max="1000"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(e.target.value)}
                    style={{ width: '60px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                </label>
              </div>

              <div className="controls" style={{ marginTop: '12px' }}>
                <button className="btn btn-secondary" onClick={reset}>
                  🔄 Upload New File
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}