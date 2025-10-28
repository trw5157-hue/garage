# Google Sheets API Integration Guide for ICD Tuning

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click on the project dropdown at the top
   - Click "NEW PROJECT"
   - Project Name: `ICD Tuning Manager`
   - Click "CREATE"

## Step 2: Enable Google Sheets API

1. **Navigate to APIs & Services**
   - In the left sidebar, go to: `APIs & Services` → `Library`
   
2. **Search and Enable**
   - Search for: `Google Sheets API`
   - Click on it
   - Click "ENABLE" button

## Step 3: Create Service Account

1. **Go to Credentials**
   - Left sidebar: `APIs & Services` → `Credentials`
   - Click "+ CREATE CREDENTIALS"
   - Select "Service Account"

2. **Service Account Details**
   - Service account name: `icd-tuning-service`
   - Service account ID: (auto-generated)
   - Description: `Service account for ICD Tuning garage management`
   - Click "CREATE AND CONTINUE"

3. **Grant Access (Optional)**
   - Skip this step by clicking "CONTINUE"
   - Click "DONE"

## Step 4: Create and Download JSON Key

1. **Find Your Service Account**
   - In Credentials page, scroll to "Service Accounts" section
   - Click on the service account you just created (`icd-tuning-service@...`)

2. **Create Key**
   - Go to the "KEYS" tab
   - Click "ADD KEY" → "Create new key"
   - Select "JSON" format
   - Click "CREATE"
   - **Important**: A JSON file will download automatically - SAVE IT SAFELY!

3. **Note the Service Account Email**
   - Copy the email address (looks like: `icd-tuning-service@your-project.iam.gserviceaccount.com`)
   - You'll need this in Step 5

## Step 5: Create or Prepare Google Sheet

### Option A: Create New Sheet
1. Go to: https://sheets.google.com/
2. Click "+ Blank" to create a new spreadsheet
3. Name it: `ICD Tuning - Job Reports`
4. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID_HERE]/edit
   ```

### Option B: Use Existing Sheet
- Just copy the Sheet ID from the URL

## Step 6: Share Sheet with Service Account

**CRITICAL STEP - Don't Skip!**

1. Open your Google Sheet
2. Click the "Share" button (top right)
3. Paste the **service account email** from Step 4
4. Give it "Editor" permission
5. Uncheck "Notify people"
6. Click "Share"

## Step 7: Add Credentials to Your Application

1. **Locate the downloaded JSON file** from Step 4
2. **Copy the entire file content**
3. **Add to backend .env file**:

Open `/app/backend/.env` and add these lines:

```env
# Google Sheets Integration
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=your_sheet_id_from_step_5
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id",...}'
```

**Important Notes:**
- Replace `your_sheet_id_from_step_5` with the actual Sheet ID
- Replace the JSON value with your complete downloaded JSON content (in single quotes)
- Keep the JSON as a single line or use proper escaping

## Step 8: Restart Backend Service

After adding credentials, restart the backend:

```bash
cd /app/backend
sudo supervisorctl restart backend
```

## Step 9: Test the Integration

1. Login as Manager
2. Go to Manager Dashboard
3. Click "Export" button
4. Check your Google Sheet - it should now have job data!

## Troubleshooting

### Error: "The caller does not have permission"
- Make sure you shared the sheet with the service account email
- Check that the email has "Editor" permission

### Error: "Invalid credentials"
- Verify the JSON is correctly copied to .env
- Check for any line breaks or formatting issues
- Ensure the JSON is wrapped in single quotes

### Error: "API has not been used in project"
- Wait 1-2 minutes after enabling the API
- Try again

### Sheet is empty after export
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Verify GOOGLE_SHEETS_ENABLED=true
- Verify Sheet ID is correct

## Security Notes

⚠️ **Important Security Practices:**
- Never commit the JSON key file to version control
- Keep the .env file secure
- Rotate service account keys periodically
- Use minimum required permissions

## Need Help?

If you encounter any issues:
1. Check backend error logs
2. Verify all steps were completed
3. Ensure Sheet ID and JSON credentials are correct
4. Restart backend service after any .env changes
