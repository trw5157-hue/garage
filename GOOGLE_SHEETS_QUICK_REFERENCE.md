# 🚀 Google Sheets Integration - Quick Reference Card

## What You Need

1. ✅ **Google Cloud Project** with Sheets API enabled
2. ✅ **Service Account JSON Key** file
3. ✅ **Google Sheet ID** from your spreadsheet URL
4. ✅ **Sheet shared** with service account email

---

## 📋 Quick Setup Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Google Sheets API
- [ ] Created Service Account
- [ ] Downloaded JSON key file
- [ ] Created/opened Google Sheet
- [ ] Copied Sheet ID from URL
- [ ] Shared sheet with service account email (EDITOR permission)
- [ ] Added credentials to `/app/backend/.env`
- [ ] Restarted backend service

---

## 🔧 Environment Variables Format

Add these to `/app/backend/.env`:

```bash
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"icd-tuning-123456","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n","client_email":"icd-tuning-service@icd-tuning-123456.iam.gserviceaccount.com","client_id":"123456789012345678901","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}'
```

**Important:**
- Set `GOOGLE_SHEETS_ENABLED=true` to activate
- Replace Sheet ID with your actual ID
- Paste the **entire JSON** in single quotes
- Keep JSON on ONE LINE (no line breaks inside the quotes)

---

## 🧪 Testing

1. Restart backend: `sudo supervisorctl restart backend`
2. Login as Manager
3. Click "Export" button in Manager Dashboard
4. Check for success message with Sheet URL
5. Click to open the Google Sheet

---

## ❌ Common Issues & Solutions

### "Failed to open Google Sheet"
**Solution:** Make sure you shared the sheet with the service account email

### "Invalid credentials"
**Solution:** Check that JSON is correctly formatted in .env (single line, in quotes)

### "API not enabled"
**Solution:** Go to Google Cloud Console and enable Google Sheets API

### "Permission denied"
**Solution:** Service account needs "Editor" access to the sheet

---

## 📊 What Gets Exported?

When you click "Export", the system exports:
- All job records from the database
- Customer details (name, contact)
- Vehicle information (brand, model, year, registration)
- Job details (work description, status, dates)
- Mechanic assignments
- Invoice amounts
- Notes and completion dates

**Format:**
- ✅ Headers in red with white text
- ✅ Auto-resized columns
- ✅ Formatted currency
- ✅ Timestamp with who exported and when

---

## 🔗 Useful Links

- **Full Setup Guide:** `/app/GOOGLE_SHEETS_SETUP_GUIDE.md`
- **Google Cloud Console:** https://console.cloud.google.com/
- **Google Sheets:** https://sheets.google.com/

---

## 💡 Pro Tips

1. **Create a dedicated project** in Google Cloud for this integration
2. **Use a descriptive service account name** like "icd-tuning-sheets-export"
3. **Keep the JSON key file secure** - never commit to version control
4. **Create a separate sheet** for exports (don't mix with other data)
5. **Test with a dummy sheet first** before using production data

---

## 🆘 Need Help?

1. Check `/app/GOOGLE_SHEETS_SETUP_GUIDE.md` for detailed instructions
2. Review backend logs: `tail -f /var/log/supervisor/backend.err.log`
3. Verify credentials are in .env correctly
4. Ensure backend was restarted after adding credentials
