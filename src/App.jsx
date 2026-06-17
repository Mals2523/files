import React, { useState } from 'react';
import Papa from 'papaparse';
import './App.css';

export default function App() {
  const [data, setData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [countryRules, setCountryRules] = useState({
    'India': 10,
    'Singapore': 8,
    'UAE': 9
  });
  const [step, setStep] = useState('upload'); // upload, config, dashboard
  const [selectedRow, setSelectedRow] = useState(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [newDigits, setNewDigits] = useState('');
  const [aiInsights, setAiInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);

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

  const validateData = () => {
    const results = data.map((row, idx) => {
      const errors = [];

      // Phone validation
      if (row.phone) {
        const country = row.country || 'India';
        const expectedDigits = countryRules[country];
        if (expectedDigits) {
          const digitsOnly = row.phone.toString().replace(/\D/g, '');
          if (digitsOnly.length !== expectedDigits) {
            errors.push(`Invalid phone (expected ${expectedDigits} digits, got ${digitsOnly.length})`);
          }
        }
      } else if (!row.phone) {
        errors.push('Missing phone');
      }

      // Email validation
      if (row.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          errors.push('Invalid email format');
        }
      }

      // Null checks for critical fields
      if (!row.customer_id) errors.push('Missing customer_id');
      if (!row.order_id) errors.push('Missing order_id');
      if (!row.payment_mode) errors.push('Missing payment_mode');

      // Type checks
      if (row.amount) {
        const amount = parseFloat(row.amount);
        if (isNaN(amount)) {
          errors.push('Invalid amount (not numeric)');
        } else if (amount < 0) {
          errors.push('Negative amount');
        }
      }

      return {
        row: idx + 1,
        ...row,
        errors,
        isValid: errors.length === 0
      };
    });

    setValidationResults(results);
    setStep('dashboard');
    generateInsights(results);
  };

  const generateInsights = async (results) => {
    setLoadingInsights(true);
    const total = results.length;
    const valid = results.filter(r => r.isValid).length;
    const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);

    const errorTypes = {};
    results.forEach(r => {
      r.errors.forEach(err => {
        const key = err.split('(')[0].trim();
        errorTypes[key] = (errorTypes[key] || 0) + 1;
      });
    });

    const summary = {
      totalRows: total,
      validRows: valid,
      errorCount,
      quality: Math.round((valid / total) * 100),
      errorBreakdown: errorTypes
    };

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Analyze this data validation summary. Provide insights in 150 words max. Format: 
**Dataset Quality:** [score]%
**Major Issues:** 3 bullet points (specific counts)
**Recommendations:** 3 bullet points

Data: ${JSON.stringify(summary)}`
          }]
        })
      });

      const respData = await response.json();
      const text = respData.content[0].text;
      setAiInsights(text);
    } catch (error) {
      const fallback = `**Dataset Quality:** ${summary.quality}%
**Major Issues:**
• ${Object.entries(errorTypes).slice(0, 3).map(([k, v]) => `${k}: ${v} errors`).join('\n• ')}
**Recommendations:**
• Fix critical missing fields first
• Standardize phone number formats by country
• Review amount field for data type consistency`;
      setAiInsights(fallback);
    }
    setLoadingInsights(false);
  };

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

  const downloadCleanedCSV = () => {
    const cleaned = validationResults.filter(r => r.isValid);
    if (cleaned.length === 0) {
      alert('No valid rows to download');
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

  const downloadSampleCSV = () => {
    const sampleData = [
      ['customer_id', 'order_id', 'email', 'phone', 'country', 'payment_mode', 'amount'],
      ['C001', 'O001', 'john@gmail.com', '9876543210', 'India', 'credit_card', '1500'],
      ['C002', 'O002', 'jane@example.com', '12345', 'India', 'debit_card', '2000'],
      ['C003', 'O003', '', '98765432', 'Singapore', 'upi', '3000'],
      ['C004', 'O004', 'invalid-email', '971234567', 'UAE', 'paypal', '2500'],
      ['C005', '', 'bob@yahoo.com', '9123456789', 'India', 'credit_card', '-500']
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_data.csv';
    a.click();
  };

  const reset = () => {
    setData([]);
    setValidationResults([]);
    setStep('upload');
    setSelectedRow(null);
    setAiInsights('');
  };

  // Calculations
  const total = validationResults.length;
  const valid = validationResults.filter(r => r.isValid).length;
  const errorCount = validationResults.reduce((sum, r) => sum + r.errors.length, 0);
  const quality = total > 0 ? Math.round((valid / total) * 100) : 0;

  const errorTypes = {};
  validationResults.forEach(r => {
    r.errors.forEach(err => {
      const key = err.split('(')[0].trim();
      errorTypes[key] = (errorTypes[key] || 0) + 1;
    });
  });

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>💙 Xeno Data Validator</h1>
          <p>Transaction data validation & processing platform</p>
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
            {/* KPI Cards */}
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
                  <div className="kpi-value">{quality}%</div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {(loadingInsights || aiInsights) && (
              <div className="section">
                <h3 className="section-title">AI Dataset Analysis</h3>
                {loadingInsights ? (
                  <div className="loading">
                    <div className="spinner"></div>
                    <p>Generating insights...</p>
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
                    <span>Row {selectedRow.row} Details</span>
                    <button
                      className="btn btn-sm"
                      onClick={() => setSelectedRow(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="inspector-content">
                    <div className="field">
                      <strong>Customer ID:</strong> {selectedRow.customer_id || '(missing)'}
                    </div>
                    <div className="field">
                      <strong>Order ID:</strong> {selectedRow.order_id || '(missing)'}
                    </div>
                    <div className="field">
                      <strong>Email:</strong> {selectedRow.email || '(missing)'}
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
                    {selectedRow.errors.length > 0 && (
                      <div className="field" style={{ marginTop: '12px' }}>
                        <strong>Issues:</strong>
                        <div className="error-list">
                          {selectedRow.errors.map((err, i) => (
                            <span key={i} className="error-badge">
                              {err}
                            </span>
                          ))}
                        </div>
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
                      <th>ID</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Errors</th>
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
                        <td>{row.customer_id || '-'}</td>
                        <td>{row.email || '-'}</td>
                        <td>{row.phone || '-'}</td>
                        <td>{row.isValid ? '✓ Valid' : '✕ Error'}</td>
                        <td>{row.errors.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Download & Reset */}
            <div className="section">
              <div className="controls">
                <button className="btn btn-success" onClick={downloadCleanedCSV}>
                  📥 Download Clean CSV
                </button>
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
