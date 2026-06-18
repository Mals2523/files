# Xeno Data Validator

A web-based transaction data validation and processing platform built for the Xeno Implementation Internship Assignment.

## Features

* CSV Upload & Parsing
* Country-specific Phone Validation
* Date Validation
* Duplicate Order Detection
* Missing Field & Data Integrity Checks
* Dataset Quality Scoring
* AI-powered Dataset Insights
* Error Analytics Dashboard
* Auto-Fix Suggestions
* Clean CSV Export
* Chunked CSV Export
* Validation Report Download

## Tech Stack

* React
* PapaParse
* JavaScript
* CSS

## Workflow

1. Upload a transaction CSV file
2. Configure country-specific phone validation rules
3. Run validation
4. Review dashboard metrics and AI insights
5. Inspect row-level issues
6. Download cleaned data
7. Download chunked CSV files for large datasets

## Validation Checks

* Phone number length by country
* Date format validation
* Required field validation
* Duplicate order detection
* Payment mode validation
* Amount validation
* General data integrity checks

## Local Setup

```bash
npm install
npm run dev
```
## Sample Dataset

A sample dataset (`sample_invalid.csv`) is included in the repository to demonstrate validation scenarios such as:

- Invalid phone numbers
- Invalid dates
- Missing payment modes
- Duplicate order IDs
- Negative amounts

## Deployment

The application is deployed on Vercel and can be accessed through the submitted project URL.

## Future Improvements

* Authentication & user management
* Database persistence
* Advanced reporting & visualizations
* Real AI integration using LLM APIs
* Bulk processing for very large datasets


