# Xeno Data Validator

A React-based web platform for transaction data validation and processing with AI-powered insights.

## Features

✅ **CSV Upload** - Drag & drop or browse  
✅ **Configurable Validation Rules** - Country-specific phone validation  
✅ **Smart Validation Engine** - Phone, email, nulls, types, duplicates  
✅ **Interactive Dashboard** - KPIs, error summary, quality score  
✅ **Row Inspector** - Click any row to see detailed errors  
✅ **AI Insights** - Claude API generates analysis  
✅ **Export** - Download clean, validated CSV  

## Quick Start

### 1. Install Node.js (if not already installed)

Download from https://nodejs.org/ (LTS recommended)

### 2. Setup Project

```bash
# Navigate to the project directory
cd xeno-validator

# Install dependencies
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The app will automatically open in your browser at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

Output goes to the `dist/` folder.

## How to Use

1. **Upload CSV** - Click upload area or drag & drop your CSV file
2. **Configure Rules** - Add/edit country phone validation rules (India: 10 digits, Singapore: 8, etc.)
3. **Run Validation** - Click "Run Validation" to process the data
4. **Review Results** - Check KPIs, error summary, and individual rows
5. **Download Clean Data** - Export only valid rows as CSV

## Sample CSV Format

```csv
customer_id,order_id,email,phone,country,payment_mode,amount
C001,O001,john@gmail.com,9876543210,India,credit_card,1500
C002,O002,jane@example.com,9876543211,India,debit_card,2000
C003,O003,bob@yahoo.com,98765432,Singapore,upi,3000
```

## Validation Rules

- **Phone**: Validates country-specific digit length
- **Email**: Basic email format validation
- **Required Fields**: customer_id, order_id, payment_mode
- **Amount**: Must be numeric and non-negative
- **Nulls**: Flagged for critical fields

## Deploying to Vercel

```bash
# Install Vercel CLI (first time only)
npm install -g vercel

# Deploy
vercel
```

Vercel will give you a live URL instantly.

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **PapaParse** - CSV parsing
- **Claude API** - AI insights
- **CSS3** - Styling

## Environment

The app runs entirely in the browser. No backend needed. Claude API calls are made directly from the browser.

## Troubleshooting

### npm command not found
- Node.js not installed. Download from https://nodejs.org/

### Port 5173 already in use
- Change port in `vite.config.js` or kill the process using the port

### Claude API errors
- Check your internet connection
- Verify API key is valid (if required by your setup)

## File Structure

```
xeno-validator/
├── src/
│   ├── App.jsx          # Main React component
│   ├── App.css          # Styling
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Build config
└── README.md            # This file
```

## Performance

- Handles ~1000+ rows smoothly
- Client-side validation (instant)
- AI insights generated on-demand
- CSV download chunking ready

## Support

For issues, check:
1. Browser console (F12) for errors
2. Network tab to verify API calls
3. File format (ensure CSV is valid)

---

**Built for Xeno Implementation Internship**
