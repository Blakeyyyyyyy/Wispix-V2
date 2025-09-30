# 🎯 Wispix Agent Configuration

## **Current Active Agents: ONLY 2**

### **✅ TaskManager**
- **Schedule**: `*/30 * * * *` (Every 30 minutes)
- **Purpose**: Smart task analysis with change detection
- **Integrations**: Notion + Airtable
- **Features**: Only acts when data changes, intelligent significance analysis
- **Status**: ACTIVE

### **✅ InboxManager**
- **Schedule**: `*/5 * * * *` (Every 5 minutes)
- **Purpose**: Email classification and follow-up management
- **Integrations**: Gmail + AI classification
- **Status**: ACTIVE

---

## **❌ Disabled Agents**

### **DailyBriefer**
- **Previous Schedule**: `0 9 * * *` (9:00 AM daily)
- **Status**: DISABLED

### **CRMManager**
- **Previous Schedule**: `*/30 * * * *` (Every 30 minutes)
- **Status**: DISABLED

### **DigestMailer**
- **Previous Schedule**: `0 16 * * 1-5` (4:00 PM weekdays)
- **Status**: DISABLED

---

## **🔧 Configuration Changes Made**

### **1. Updated Seed Endpoint**
- `backend/src/routes/agents.dev.ts`
- Only creates TaskManager and InboxManager
- Removed DailyBriefer, CRMManager, and DigestMailer

### **2. Updated Runtime Servers**
- `backend/src/index.runtime.ts` (local)
- `backend/src/index.runtime.railway.ts` (Railway)
- Both now only initialize TaskManager and InboxManager

### **3. Database Filtering**
- Automations are filtered by `agentKind` in `['TaskManager', 'InboxManager']`
- Other agents are automatically excluded from scheduling

---

## **🚀 Railway Deployment**

### **What Happens on Railway:**
1. **Only 2 agents** are scheduled and active
2. **TaskManager** runs at 6 PM weekdays
3. **InboxManager** runs every 5 minutes
4. **All other agents** are completely disabled
5. **24/7 operation** independent of local machine

### **Environment Variables:**
- All integrations remain configured
- Only the active agents use the credentials
- Disabled agents don't consume resources

---

## **📋 Verification Steps**

### **After Deployment:**
1. Check Railway logs for "TaskManager and InboxManager scheduled successfully"
2. Verify only 2 automations are active in database
3. Test TaskManager execution at 6 PM
4. Test InboxManager execution every 5 minutes
5. Confirm no other agents are running

---

## **🔄 Re-enabling Other Agents**

If you want to re-enable other agents later:

1. **Update seed endpoint** to include desired agents
2. **Update runtime servers** to remove agent filtering
3. **Run cleanup script** to reactivate desired agents
4. **Redeploy** to Railway

---

## **📊 Resource Usage**

### **Current (2 agents):**
- **TaskManager**: Runs once daily, low resource usage
- **InboxManager**: Runs every 5 minutes, moderate resource usage
- **Total**: Minimal resource consumption

### **Previous (5 agents):**
- **All agents**: Running continuously, high resource usage
- **Result**: System overload and missed executions

---

**Status**: ✅ **CONFIGURATION COMPLETE** - Only TaskManager and InboxManager are active

