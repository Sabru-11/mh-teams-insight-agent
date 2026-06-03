# Healthcare IT Support Knowledge Base

## VPN Connectivity Issues for Remote Clinicians

**Problem:** Remote clinicians report frequent VPN disconnections when accessing the Electronic Health Records (EHR) system from home or satellite clinics.

**Root Cause:** Split-tunnel VPN configurations conflict with the EHR application's requirement for full-tunnel mode. Additionally, some ISPs throttle VPN traffic during peak hours.

**Resolution Steps:**
1. Open the GlobalProtect VPN client and navigate to Settings > Connection.
2. Ensure "Full Tunnel" mode is selected (not "Split Tunnel").
3. If disconnections persist, switch to the backup VPN gateway: `vpn-backup.healthsys.internal`.
4. For ISP throttling, enable the "Obfuscation" option under Advanced Settings.
5. Restart the VPN client and verify EHR access.

**Escalation:** If the issue persists after these steps, escalate to the Network Security team (Tier 2) with VPN client logs from `C:\ProgramData\GlobalProtect\Logs`.

---

## EHR System Slow Response During Peak Hours

**Problem:** The Epic EHR system becomes extremely slow between 8:00 AM and 10:00 AM when all departments begin morning rounds and charting.

**Root Cause:** Database connection pool exhaustion on the Citrix server farm hosting the EHR application. The connection pool is configured for 500 concurrent sessions, but peak usage reaches 800+.

**Resolution Steps:**
1. Check current Citrix session count: `Get-BrokerSession -AdminAddress ctx-ddc01 | Measure-Object`
2. If sessions exceed 500, restart the overflow Citrix servers: CTX-APP-05 and CTX-APP-06.
3. Clear stale sessions: `Get-BrokerSession -SessionState Disconnected | Remove-BrokerSession`
4. Monitor via the Citrix Director dashboard at `https://citrix-director.healthsys.internal`.
5. If response time doesn't improve within 15 minutes, escalate to the EHR Infrastructure team.

**Workaround:** Advise clinicians to use the EHR web client (`https://ehr-web.healthsys.internal`) as a temporary alternative — it bypasses Citrix entirely.

---

## HIPAA-Compliant File Sharing Requests

**Problem:** Clinical staff frequently ask about sharing patient data with external specialists or insurance providers and accidentally use personal email or consumer cloud storage.

**Root Cause:** Lack of awareness about approved secure file-sharing tools. Staff default to familiar consumer tools (Gmail, Dropbox) that violate HIPAA.

**Resolution Steps:**
1. Direct users to the approved secure file-sharing portal: `https://secureshare.healthsys.internal`.
2. All external shares must be encrypted and require recipient authentication.
3. Walk the user through creating a secure share link:
   - Log in with their hospital credentials.
   - Click "New Secure Share" > select files > set expiration (max 7 days).
   - Add recipient email — they will receive a one-time access code via SMS.
4. Log the share request in the HIPAA Compliance Tracker (ServiceNow RITM ticket).

**Important:** If patient data was already shared via an unapproved method, immediately escalate to the Privacy Officer and create a HIPAA Incident Report (Category: Potential Breach).

---

## Printer Issues in Clinical Areas

**Problem:** Nurses report that medication labels and patient wristbands are not printing from workstations on wheels (WOWs) in patient care units.

**Root Cause:** WOWs frequently roam between floors and lose their mapped printer assignments. The print spooler also crashes under high-volume label printing.

**Resolution Steps:**
1. On the affected WOW, open Command Prompt as admin and run:
   ```
   net stop spooler
   del /Q /F %systemroot%\System32\spool\PRINTERS\*
   net start spooler
   ```
2. Re-map the correct floor printer using the Printer Deployment Portal: `https://printers.healthsys.internal`.
3. Select the correct unit (e.g., "4-North", "ICU-2") and click "Deploy Printers".
4. Test print a label from the EHR system.
5. If the Zebra label printer specifically is not responding, power-cycle the printer and recalibrate labels: hold the Feed button for 5 seconds until the green light blinks twice.

**Escalation:** For recurring printer failures on the same unit, create a ticket for Biomedical Engineering to inspect the hardware.

---

## Multi-Factor Authentication (MFA) Lockouts

**Problem:** Physicians and nurses get locked out of clinical systems after their MFA token expires or their authenticator app stops working, especially during overnight shifts.

**Root Cause:** The Azure AD MFA policy enforces a 12-hour token lifetime. Overnight shift workers who start at 7 PM find their tokens expiring at 7 AM during critical morning handoff.

**Resolution Steps:**
1. Verify the user's identity by confirming their Employee ID and department.
2. Issue a temporary MFA bypass in Azure AD:
   - Navigate to Azure Portal > Azure AD > Users > [select user] > Authentication Methods.
   - Click "Temporary Access Pass" > Generate (valid for 2 hours).
   - Communicate the TAP to the user via their verified phone number only.
3. Instruct the user to re-register their authenticator app within the 2-hour window:
   - Go to `https://aka.ms/mysecurityinfo` and add Microsoft Authenticator.
4. If the user has a hardware FIDO2 key, verify it's registered under their security info.

**Policy Note:** Temporary Access Passes must be logged in the IT Security Audit system. Never share TAPs via email or Teams chat.

---

## Medical Device Integration Failures

**Problem:** Patient monitors in the ICU are not sending vitals data to the EHR system. Nurses have to manually enter heart rate, blood pressure, and SpO2 readings.

**Root Cause:** The HL7 interface engine (Rhapsody) lost connectivity to the device gateway server after a network switch replacement on the ICU floor.

**Resolution Steps:**
1. Check the Rhapsody Integration Engine dashboard: `https://rhapsody.healthsys.internal:8444`.
2. Navigate to Route Manager > ICU Device Routes and check for error states (red indicators).
3. Verify the device gateway server `icu-devgw-01` is reachable: `ping icu-devgw-01.healthsys.internal`.
4. If unreachable, check the network switch port configuration:
   - VLAN 110 (Medical Devices) must be tagged on the uplink port.
   - Contact Network team to verify switch config was restored after replacement.
5. Restart the affected Rhapsody routes once connectivity is restored.
6. Verify data flow by checking the EHR flowsheet for real-time vitals updates.

**Critical:** Medical device integration failures in ICU are **Severity 1**. Escalate immediately if not resolved within 30 minutes. Patient safety is the top priority.

---

## Password Reset for Clinical Applications

**Problem:** A clinician's password has expired for one or more clinical systems (EHR, PACS, Lab Information System) and they cannot access patient records during their shift.

**Root Cause:** Password policies require 90-day rotation, but clinical staff working irregular schedules often miss the 14-day advance warning emails.

**Resolution Steps:**
1. Verify the caller's identity: Employee ID + date of birth + department.
2. Reset the Active Directory password via ADUC or the IT Self-Service Portal.
3. For EHR-specific password resets:
   - Open the Epic Admin Console > User Management > Reset Password.
   - The new password must meet Epic's complexity requirements (12+ chars, mixed case, number, special char).
4. For PACS access, reset via the Sectra Admin Console at `https://pacs-admin.healthsys.internal`.
5. Advise the user to update saved credentials on all workstations they use.

**Proactive Measure:** Enroll the user in the Password Expiry SMS Notification system to prevent future lockouts.
