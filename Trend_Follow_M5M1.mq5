//+------------------------------------------------------------------+
//| Trend_Follow_M5M1.mq5 - Signal EA v3.04 (UI/UX Upgraded)         |
//| NO real orders: signal engine + visual objects + dashboard       |
//| Use in Strategy Tester for backtest / optimization               |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Antigravity"
#property link      ""
#property version   "1.00"

//==================================================================
// ENUMS
//==================================================================
enum ENUM_SIGNAL_MODE          { SIGNAL_ON_TOUCH=0, SIGNAL_ON_CANDLE_CLOSE=1 };
enum ENUM_DASH_WIN_TARGET      { DASH_WIN_NONE=0, DASH_WIN_TP1=1, DASH_WIN_TP2=2, DASH_WIN_TP3=3, DASH_WIN_TP4=4 };
enum ENUM_HIST_SAME_BAR_POLICY { SAME_BAR_SKIP=0, SAME_BAR_CONSERVATIVE_LOSS=1 };

//==================================================================
// INPUTS
//==================================================================
input group "=== General ==="
input ulong  InpMagicNumber      = 790011;   // Magic (used for object naming only)
input bool   InpAllowBuy         = true;     // Allow Buy Signals
input bool   InpAllowSell        = true;     // Allow Sell Signals
input int    InpMaxSpreadPoints  = 0;        // Max Spread Points (0=disabled)
input int    InpMaxDistPoints    = 100;      // Max Distance From Entry Level (Points)

input group "=== Dynamic Range ==="
input bool   InpShowZones        = true;     // Show DR Zones (Red/Green Boxes)
input bool   InpShowZoneMidlines = true;     // Show DR Midlines (Avg)
input int    InpDRLength         = 100;      // ATR Length
input double InpDRMult           = 6.0;      // ATR Multiplier
input color  InpResistColor      = C'180,35,50';  // Resistance Zone Color
input color  InpSupportColor     = C'20,120,50';  // Support Zone Color
input int    InpZoneTransparency = 50;       // Zone Transparency % (0=Opaque,100=Transparent)
input int    InpZoneExtendBars   = 60;       // Extend Current Zone Right (Bars)
input int    InpZoneHistoryBars  = 1500;     // Historical Bars To Draw

input group "=== MACD Filter ==="
input bool   InpUseMACDFilter    = true;     // Use MACD Filter
input int    InpMACDFast         = 50;       // MACD Fast EMA
input int    InpMACDSlow         = 200;      // MACD Slow EMA
input int    InpMACDSignal       = 9;        // MACD Signal SMA
input ENUM_APPLIED_PRICE InpMACDPrice = PRICE_CLOSE; // MACD Applied Price

input group "=== Signal Mode ==="
input double InpEntryPercent     = 0.0;      // Entry Percent (0=Box Edge, 100=Far Edge)

input group "=== Stop Loss ==="
input int    InpSLOffsetPoints   = 0;        // SL Offset Points beyond box
input bool   InpIncludeSpreadSL  = true;     // Add Spread to Sell SL

input group "=== Take Profit ==="
input double InpTP1_RR           = 0.25;     // TP1 Risk:Reward
input double InpTP2_RR           = 0.5;      // TP2 Risk:Reward
input double InpTP3_RR           = 1.0;      // TP3 Risk:Reward
input double InpTP4_RR           = 2.0;      // TP4 Risk:Reward

input group "=== Signal Options ==="
input bool   InpOneSignalPerZone = true;     // One Signal Per Zone
input ENUM_HIST_SAME_BAR_POLICY InpHistSameBarPolicy = SAME_BAR_SKIP; // Hist Same-Bar Policy

input group "=== Telegram ==="
input bool   InpUseTelegram      = true;     // Send Telegram Alert
input string InpTelegramToken    = "";       // Bot Token
input string InpTelegramChatID   = "";       // Chat ID
input bool   InpSendChartImage   = true;     // Send Chart Image
input bool   InpReportResults    = true;     // Report Signal Results (TP/SL)
input bool   InpShowTestButton   = true;     // Show Test Button
input int    InpTestButtonX      = 10;       // Test Button X Distance
input int    InpTestButtonY      = 150;      // Test Button Y Distance
input int    InpTelegramTimeout  = 5000;     // WebRequest Timeout (ms)

input group "=== Telegram Time ==="
input bool   InpUseThaiTime      = true;     // Show Telegram Time as Thai Time
input bool   InpAutoDetectBrokerOffset = true; // Auto Detect Broker UTC Offset
input int    InpThaiUTCOffset    = 7;        // Thai UTC Offset
input int    InpManualBrokerUTCOffset = 3;   // Manual Broker UTC Offset

input group "=== Website Sync ==="
input bool   InpUseWebsiteSync   = true;     // Enable Website Sync
input string InpWebsiteApiUrl    = "http://127.0.0.1:8787"; // API Base URL
input string InpWebsiteApiKey    = "dev-test-key-t47101fs"; // API Key (x-api-key)
input int    InpWebsiteTimeout   = 4000;     // WebRequest Timeout (ms)
input int    InpWebsitePriceMs   = 3000;     // Price Snapshot Interval (ms)
input int    InpWebsiteCandles   = 60;       // OHLC Candles Per Snapshot (M1/M5)

input group "=== Visual Objects ==="
input bool   InpShowSignalObjects   = true;  // Show Signal Lines
input bool   InpShowRRBoxes         = true;  // Show Risk/Reward Boxes (TradingView Style)
input bool   InpShowHistSignals     = true;  // Show Historical Signal Lines
input int    InpMaxHistSignals      = 20;    // Max Visible Historical Signals
input int    InpSigExtendBars       = 20;    // Extend Signal Lines (Bars)
input int    InpSigTextOffsetBars   = 2;     // Text Offset (Bars)
input int    InpHistTextSize        = 7;     // Historical Signal Text Size
input int    InpLiveTextSize        = 10;    // Current/Live Signal Text Size
input bool   InpShowEntry           = true;  // Show Entry Line
input bool   InpShowSL              = true;  // Show SL Line
input bool   InpShowTP1             = true;  // Show TP1 Line
input bool   InpShowTP2             = true;  // Show TP2 Line
input bool   InpShowTP3             = true;  // Show TP3 Line
input bool   InpShowTP4             = true;  // Show TP4 Line
input bool   InpShowSigText         = true;  // Show Signal Text Labels
input bool   InpClearObjectsWhenAlgoOff = false; // Clear Objects When Algo Trading Off
input bool   InpForceClearObjects   = false; // Force Clear Objects And Stop Drawing
input bool   InpDeleteAllChartObjectsOnRemove = true; // Delete All Chart Objects On EA Remove

input group "=== Dashboard ==="
input bool   InpShowDashboard       = true;  // Show Dashboard
input ENUM_BASE_CORNER InpDashCorner= CORNER_LEFT_UPPER; // Dashboard Corner
input int    InpDashX               = 10;    // Dashboard X Distance
input int    InpDashY               = 20;    // Dashboard Y Distance
input int    InpDashFontSize        = 11;    // Dashboard Font Size
input int    InpDashWidth           = 260;   // Dashboard Width
input int    InpDashPadding         = 10;    // Dashboard Padding
input int    InpDashLineGap         = 8;     // Dashboard Line Gap
input int    InpDashSignalCount     = 100;   // Dashboard Signal Count (recent N resolved)
input ENUM_DASH_WIN_TARGET InpDashWinTarget = DASH_WIN_NONE; // Win Target

input group "=== Debugging ==="
input bool   InpDebugSignals        = true;  // Print Signal Blocks & Triggers
input bool   InpDebugEveryNewBar    = true;  // Print Status Summary Every New Bar

//==================================================================
// GLOBALS
//==================================================================
int      g_atr_handle      = INVALID_HANDLE;
int      g_macd_handle     = INVALID_HANDLE;
string   g_zpfx;        // zone object prefix   (deleted/redrawn per bar)
string   g_spfx;        // signal object prefix (NEVER deleted after creation except on init)
string   g_dash_name;
datetime g_last_bar_time   = 0;
datetime g_last_zone_bar   = 0;
bool     g_history_scanned = false;
bool     g_algo_off_cleaned = false;
string   g_test_button_name;

//--- Website Sync tracking
ulong    g_last_website_market_ms = 0;   // last time we pushed a market snapshot
ulong    g_last_website_bulk_ms   = 0;   // last time we bulk-resynced signals + objects

const ENUM_SIGNAL_MODE InpSignalMode = SIGNAL_ON_TOUCH;
const bool InpAllowMidReentry = false;
const bool InpUseHistoricalSignalsForZoneLock = false;

//--- Signal Record
struct SignalRecord
  {
   bool     is_buy;
   int      is_reentry;       // 0=first  1=reentry
   datetime signal_bar_time;
   datetime zone_start_time;
   double   entry, sl;
   double   tp1, tp2, tp3, tp4;
   int      result;            // 0=open  1=win  -1=loss
   int      result_tp1;
   int      result_tp2;
   int      result_tp3;
   int      result_tp4;
   bool     objects_created;
   bool     is_live;
   bool     reported;
   long     tg_msg_id;
  };

#define MAX_SIGNALS 5000
SignalRecord g_signals[];
int g_signal_count = 0;

//--- Zone signal tracking
struct ZoneSigRec
  {
   datetime zone_start;
   double   buy_entry;
   double   sell_entry;
   bool     had_buy_first, had_sell_first;
   bool     had_buy_reentry, had_sell_reentry;
   bool     buy_reentry_armed, sell_reentry_armed;
  };
ZoneSigRec g_zsigs[];
int g_zsig_count = 0;

string DeinitReasonText(const int reason)
  {
   switch(reason)
     {
      case REASON_PROGRAM:     return "PROGRAM";
      case REASON_REMOVE:      return "REMOVE";
      case REASON_RECOMPILE:   return "RECOMPILE";
      case REASON_CHARTCHANGE: return "CHARTCHANGE";
      case REASON_CHARTCLOSE:  return "CHARTCLOSE";
      case REASON_PARAMETERS:  return "PARAMETERS";
      case REASON_ACCOUNT:     return "ACCOUNT";
      case REASON_TEMPLATE:    return "TEMPLATE";
      case REASON_INITFAILED:  return "INITFAILED";
      case REASON_CLOSE:       return "TERMINAL_CLOSE";
      default:                 return "UNKNOWN";
     }
  }

bool EnsureIndicatorHandles()
  {
   if(g_atr_handle == INVALID_HANDLE)
     {
      ResetLastError();
      g_atr_handle = iATR(_Symbol, _Period, InpDRLength);
      if(g_atr_handle == INVALID_HANDLE)
        {
         PrintFormat("Trend_Follow_M5M1: ATR handle not ready. Error=%d", GetLastError());
         return false;
        }
     }

   if(InpUseMACDFilter && g_macd_handle == INVALID_HANDLE)
     {
      ResetLastError();
      g_macd_handle = iMACD(_Symbol,_Period,InpMACDFast,InpMACDSlow,InpMACDSignal,InpMACDPrice);
      if(g_macd_handle == INVALID_HANDLE)
        {
         PrintFormat("Trend_Follow_M5M1: MACD handle not ready. Error=%d", GetLastError());
         return false;
        }
     }

   return true;
  }

bool ShouldDeleteObjectsOnDeinit(const int reason)
  {
   return (reason==REASON_REMOVE ||
           reason==REASON_CHARTCLOSE ||
           reason==REASON_CLOSE ||
           reason==REASON_TEMPLATE ||
           reason==REASON_RECOMPILE ||
           reason==REASON_PROGRAM);
  }

bool AlgoTradingAllowedNow()
  {
   return (TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) &&
           MQLInfoInteger(MQL_TRADE_ALLOWED) &&
           AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) &&
           AccountInfoInteger(ACCOUNT_TRADE_EXPERT));
  }

bool HandleAlgoOffCleanup()
  {
   if(!InpClearObjectsWhenAlgoOff && !InpForceClearObjects)
      return false;

   bool should_clear = InpForceClearObjects || !AlgoTradingAllowedNow();

   if(!should_clear)
     {
      if(g_algo_off_cleaned)
        {
         g_algo_off_cleaned = false;
         g_history_scanned = false;
         g_last_zone_bar = 0;
        }
      return false;
     }

   if(!g_algo_off_cleaned)
     {
      DeleteAnyDashboardObjects();
      DeleteAllJPSObjects();
      g_algo_off_cleaned = true;
      Print("Trend_Follow_M5M1: chart objects cleared.");
      ChartRedraw(0);
     }
   return true;
  }

//==================================================================
// COLOR UTILITIES
//==================================================================
int CR(color c) { return (int)(c & 0xFF); }
int CG(color c) { return (int)((c >> 8) & 0xFF); }
int CB(color c) { return (int)((c >> 16) & 0xFF); }

color BlendColor(color c, int t)
  {
   if(t <= 0)   return c;
   if(t >= 100) return clrBlack;
   int bg = 20; // approximate dark background
   double a = 1.0 - (double)t / 100.0;
   int r = (int)(CR(c)*a + bg*(1-a));
   int g = (int)(CG(c)*a + bg*(1-a));
   int b = (int)(CB(c)*a + bg*(1-a));
   return (color)(MathMax(0,MathMin(255,r)) | (MathMax(0,MathMin(255,g))<<8) | (MathMax(0,MathMin(255,b))<<16));
  }

//==================================================================
// LOW-LEVEL OBJECT HELPERS
//==================================================================
void ObjRect(string n, datetime t1, datetime t2, double hi, double lo, color clr)
  {
   if(ObjectFind(0,n) < 0)
     {
      ObjectCreate(0,n,OBJ_RECTANGLE,0,t1,hi,t2,lo);
      ObjectSetInteger(0,n,OBJPROP_FILL,       1);
      ObjectSetInteger(0,n,OBJPROP_BACK,       true);
      ObjectSetInteger(0,n,OBJPROP_WIDTH,      0);
      ObjectSetInteger(0,n,OBJPROP_STYLE,      STYLE_SOLID);
      ObjectSetInteger(0,n,OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0,n,OBJPROP_HIDDEN,     true);
     }
   else
     {
      ObjectSetInteger(0,n,OBJPROP_TIME,  0, t1);
      ObjectSetDouble (0,n,OBJPROP_PRICE, 0, hi);
      ObjectSetInteger(0,n,OBJPROP_TIME,  1, t2);
      ObjectSetDouble (0,n,OBJPROP_PRICE, 1, lo);
     }
   ObjectSetInteger(0,n,OBJPROP_COLOR, clr);
  }

void ObjTrend(string n, datetime t1, double p1, datetime t2, double p2,
              color clr, ENUM_LINE_STYLE sty, int w, bool ray, bool back)
  {
   if(ObjectFind(0,n) < 0)
     {
      ObjectCreate(0,n,OBJ_TREND,0,t1,p1,t2,p2);
      ObjectSetInteger(0,n,OBJPROP_STYLE,      sty);
      ObjectSetInteger(0,n,OBJPROP_WIDTH,      w);
      ObjectSetInteger(0,n,OBJPROP_RAY_RIGHT,  ray);
      ObjectSetInteger(0,n,OBJPROP_BACK,       back);
      ObjectSetInteger(0,n,OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0,n,OBJPROP_HIDDEN,     true);
     }
   else
     {
      ObjectSetInteger(0,n,OBJPROP_TIME,  0, t1);
      ObjectSetDouble (0,n,OBJPROP_PRICE, 0, p1);
      ObjectSetInteger(0,n,OBJPROP_TIME,  1, t2);
      ObjectSetDouble (0,n,OBJPROP_PRICE, 1, p2);
     }
   ObjectSetInteger(0,n,OBJPROP_COLOR, clr);
  }

void ObjText(string n, datetime t, double price, string txt, color clr, int sz=8)
  {
   if(!InpShowSigText) return;
   if(ObjectFind(0,n) < 0)
     {
      ObjectCreate(0,n,OBJ_TEXT,0,t,price);
      ObjectSetInteger(0,n,OBJPROP_FONTSIZE,   sz);
      ObjectSetInteger(0,n,OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0,n,OBJPROP_HIDDEN,     true);
      ObjectSetString (0,n,OBJPROP_FONT,       "Trebuchet MS");
     }
   ObjectSetDouble (0,n,OBJPROP_PRICE, price);
   ObjectSetInteger(0,n,OBJPROP_TIME,  t);
   ObjectSetString (0,n,OBJPROP_TEXT,  txt);
   ObjectSetInteger(0,n,OBJPROP_COLOR, clr);
  }

void ObjArrow(string n, datetime t, double price, int code, color clr, ENUM_ARROW_ANCHOR anchor, int w=2)
  {
   if(ObjectFind(0,n) < 0)
     {
      ObjectCreate(0,n,OBJ_ARROW,0,t,price);
      ObjectSetInteger(0,n,OBJPROP_ARROWCODE,  code);
      ObjectSetInteger(0,n,OBJPROP_WIDTH,      w);
      ObjectSetInteger(0,n,OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0,n,OBJPROP_HIDDEN,     true);
     }
   ObjectSetInteger(0,n,OBJPROP_COLOR, clr);
   ObjectSetDouble (0,n,OBJPROP_PRICE, price);
   ObjectSetInteger(0,n,OBJPROP_TIME,  t);
   ObjectSetInteger(0,n,OBJPROP_ANCHOR, anchor);
   ObjectSetInteger(0,n,OBJPROP_BACK,  false);
   ObjectSetInteger(0,n,OBJPROP_ZORDER, 0);
  }

void DeleteByPrefix(string pfx)
  {
   ObjectsDeleteAll(0, pfx, -1, -1);
   for(int pass=0; pass<3; pass++)
      for(int i=ObjectsTotal(0,-1,-1)-1; i>=0; i--)
        {
         string n=ObjectName(0,i,-1,-1);
         if(StringFind(n,pfx)==0) ObjectDelete(0,n);
        }
  }

void DeleteDashboardsByMagic()
  {
   string pfx = "XAU_"+IntegerToString((long)InpMagicNumber)+"_";
   string jps_pfx = "JPS_"+IntegerToString((long)InpMagicNumber)+"_";
   string old_pfx = "DREA_"+IntegerToString((long)InpMagicNumber)+"_";
   for(int i=ObjectsTotal(0,-1,-1)-1; i>=0; i--)
     {
      string n=ObjectName(0,i,-1,-1);
      if((StringFind(n,pfx)==0 || StringFind(n,jps_pfx)==0 || StringFind(n,old_pfx)==0) && StringFind(n,"_DASH")>=0)
         ObjectDelete(0,n);
     }
  }

void DeleteAllJPSObjects()
  {
   DeleteByPrefix("WST_");
   DeleteByPrefix("JPS_");
   DeleteByPrefix("DREA_");
  }

void DeleteAllChartObjectsHard()
  {
   ObjectsDeleteAll(0, -1, -1);
  }

void DeleteLegacyDynamicRangeObjects()
  {
   string cid = IntegerToString((int)ChartID());
   DeleteByPrefix("DRS_"+_Symbol+"_"+cid+"_");
   DeleteByPrefix("DR_"+_Symbol+"_"+cid+"_");
  }

void DeleteAnyDashboardObjects()
  {
   for(int pass=0; pass<3; pass++)
      for(int i=ObjectsTotal(0,-1,-1)-1; i>=0; i--)
        {
         string n=ObjectName(0,i,-1,-1);
         string txt=ObjectGetString(0,n,OBJPROP_TEXT);
         if(StringFind(n,"_DASH")>=0 ||
            StringFind(txt,"Winrate")>=0 ||
            StringFind(txt,"TP1")>=0 ||
            StringFind(txt,"TP2")>=0 ||
            StringFind(txt,"TP3")>=0 ||
            StringFind(txt,"TP4")>=0)
            ObjectDelete(0,n);
        }
  }

//==================================================================
// TELEGRAM HELPERS
//==================================================================
string UrlEncode(string src)
  {
   string out = "";
   for(int i=0; i<StringLen(src); i++)
     {
      ushort ch = StringGetCharacter(src, i);
      if((ch>='0' && ch<='9') || (ch>='A' && ch<='Z') || (ch>='a' && ch<='z') ||
         ch=='-' || ch=='_' || ch=='.' || ch=='~')
         out += ShortToString(ch);
      else if(ch==' ')
         out += "+";
      else
         out += StringFormat("%%%02X", (int)ch);
     }
   return out;
  }

void AppendString(char &dst[], string txt)
  {
   char tmp[];
   int len = StringToCharArray(txt, tmp, 0, WHOLE_ARRAY, CP_UTF8);
   if(len <= 1) return;
   int old = ArraySize(dst);
   ArrayResize(dst, old + len - 1);
   for(int i=0; i<len-1; i++)
      dst[old+i] = tmp[i];
  }

void AppendBytes(char &dst[], const char &src[])
  {
   int old = ArraySize(dst);
   int len = ArraySize(src);
   ArrayResize(dst, old + len);
   for(int i=0; i<len; i++)
      dst[old+i] = src[i];
  }

bool TelegramReady()
  {
   if(!InpUseTelegram) return false;
   if(StringLen(InpTelegramToken) < 10 || StringLen(InpTelegramChatID) < 1)
     {
      Print("Trend_Follow_M5M1: Telegram token/chat_id is empty.");
      return false;
     }
   return true;
  }

bool TelegramPostForm(string method_name, string form_body, string &response)
  {
   if(!TelegramReady()) return false;

   char data[], result[];
   string result_headers;
   int data_len = StringToCharArray(form_body, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(data_len > 0) ArrayResize(data, data_len-1);

   string url = "https://api.telegram.org/bot" + InpTelegramToken + "/" + method_name;
   string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
   ResetLastError();
   int code = WebRequest("POST", url, headers, InpTelegramTimeout, data, result, result_headers);
   response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   if(code != 200)
     {
      PrintFormat("Trend_Follow_M5M1: WebRequest %s failed. HTTP=%d Error=%d Response=%s",
                  method_name, code, GetLastError(), response);
      Print("Trend_Follow_M5M1: Add https://api.telegram.org in Tools > Options > Expert Advisors > Allow WebRequest.");
      return false;
     }
   return true;
  }

long ExtractMessageId(string response)
  {
   string key = "\"message_id\":";
   int pos = StringFind(response, key);
   if(pos < 0) return 0;

   pos += StringLen(key);
   while(pos < StringLen(response))
     {
      ushort ch = StringGetCharacter(response, pos);
      if(ch!=' ' && ch!='\t' && ch!='\r' && ch!='\n') break;
      pos++;
     }

   string digits = "";
   while(pos < StringLen(response))
     {
      ushort ch = StringGetCharacter(response, pos);
      if(ch < '0' || ch > '9') break;
      digits += ShortToString(ch);
      pos++;
     }

   if(StringLen(digits) <= 0) return 0;
   return (long)StringToInteger(digits);
  }

bool TelegramSendMessage(string text, long &message_id)
  {
   string response;
   message_id = 0;
   string body = "chat_id=" + UrlEncode(InpTelegramChatID) +
                 "&parse_mode=HTML&disable_web_page_preview=1&text=" + UrlEncode(text);
   bool ok = TelegramPostForm("sendMessage", body, response);
   if(ok) message_id = ExtractMessageId(response);
   return ok;
  }

bool TelegramSendMessage(string text)
  {
   long message_id = 0;
   return TelegramSendMessage(text, message_id);
  }

bool TelegramSendMessageReply(string text, long reply_to_id)
  {
   if(reply_to_id <= 0)
      return TelegramSendMessage(text);

   string response;
   string body = "chat_id=" + UrlEncode(InpTelegramChatID) +
                 "&reply_to_message_id=" + IntegerToString(reply_to_id) +
                 "&parse_mode=HTML&disable_web_page_preview=1&text=" + UrlEncode(text);
   return TelegramPostForm("sendMessage", body, response);
  }

bool ReadFileBytes(string file_name, char &bytes[])
  {
   ResetLastError();
   int h = FileOpen(file_name, FILE_READ|FILE_BIN);
   if(h == INVALID_HANDLE)
     {
      PrintFormat("Trend_Follow_M5M1: FileOpen failed for %s. Error=%d", file_name, GetLastError());
      return false;
     }

   int size = (int)FileSize(h);
   ArrayResize(bytes, size);
   int got = (int)FileReadArray(h, bytes, 0, size);
   FileClose(h);
   if(got != size)
     {
      PrintFormat("Trend_Follow_M5M1: FileReadArray incomplete. got=%d size=%d", got, size);
      return false;
     }
   return true;
  }

bool TelegramSendPhoto(string caption, long &message_id)
  {
   message_id = 0;
   if(!TelegramReady()) return false;

   string file_name = "Trend_Follow_M5M1_" + IntegerToString((long)ChartID()) + ".png";
   int width = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS, 0);
   int height = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS, 0);
   if(width < 400) width = 1280;
   if(height < 300) height = 720;

   ChartRedraw(0);
   ResetLastError();
   if(!ChartScreenShot(0, file_name, width, height, ALIGN_RIGHT))
     {
      PrintFormat("Trend_Follow_M5M1: ChartScreenShot failed. Error=%d", GetLastError());
      return TelegramSendMessage(caption, message_id);
     }

   char photo[];
   if(!ReadFileBytes(file_name, photo))
      return TelegramSendMessage(caption, message_id);

   string boundary = "----WSignalTelegramBoundary" + IntegerToString((int)GetTickCount());
   char data[];
   AppendString(data, "--"+boundary+"\r\n");
   AppendString(data, "Content-Disposition: form-data; name=\"chat_id\"\r\n\r\n");
   AppendString(data, InpTelegramChatID+"\r\n");
   AppendString(data, "--"+boundary+"\r\n");
   AppendString(data, "Content-Disposition: form-data; name=\"caption\"\r\n\r\n");
   AppendString(data, caption+"\r\n");
   AppendString(data, "--"+boundary+"\r\n");
   AppendString(data, "Content-Disposition: form-data; name=\"parse_mode\"\r\n\r\n");
   AppendString(data, "HTML\r\n");
   AppendString(data, "--"+boundary+"\r\n");
   AppendString(data, "Content-Disposition: form-data; name=\"photo\"; filename=\"signal.png\"\r\n");
   AppendString(data, "Content-Type: image/png\r\n\r\n");
   AppendBytes(data, photo);
   AppendString(data, "\r\n--"+boundary+"--\r\n");

   char result[];
   string result_headers;
   string url = "https://api.telegram.org/bot" + InpTelegramToken + "/sendPhoto";
   string headers = "Content-Type: multipart/form-data; boundary=" + boundary + "\r\n";
   ResetLastError();
   int code = WebRequest("POST", url, headers, InpTelegramTimeout, data, result, result_headers);
   string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   FileDelete(file_name);

   if(code != 200)
     {
      PrintFormat("Trend_Follow_M5M1: sendPhoto failed. HTTP=%d Error=%d Response=%s", code, GetLastError(), response);
      Print("Trend_Follow_M5M1: Falling back to text message.");
      return TelegramSendMessage(caption, message_id);
     }
   message_id = ExtractMessageId(response);
   return true;
  }

bool TelegramSendPhoto(string caption)
  {
   long message_id = 0;
   return TelegramSendPhoto(caption, message_id);
  }

string TFText()
  {
   string tf = EnumToString(_Period);
   if(StringFind(tf, "PERIOD_") == 0)
      tf = StringSubstr(tf, 7);
   return tf;
  }

int BrokerUTCOffsetSeconds()
  {
   if(!InpAutoDetectBrokerOffset)
      return InpManualBrokerUTCOffset * 3600;

   datetime server_now = TimeTradeServer();
   datetime gmt_now = TimeGMT();
   if(server_now <= 0 || gmt_now <= 0)
      return InpManualBrokerUTCOffset * 3600;

   double offset_hours = (double)(server_now - gmt_now) / 3600.0;
   return (int)MathRound(offset_hours) * 3600;
  }

datetime TelegramDisplayTime(datetime server_time)
  {
   if(!InpUseThaiTime)
      return server_time;

   int broker_offset = BrokerUTCOffsetSeconds();
   int target_offset = InpThaiUTCOffset * 3600;
   return server_time + (datetime)(target_offset - broker_offset);
  }

string TelegramTimeText(datetime server_time)
  {
   string txt = TimeToString(TelegramDisplayTime(server_time), TIME_MINUTES);
   if(InpUseThaiTime)
      txt += " TH";
   return txt;
  }

string HtmlEscape(string txt)
  {
   StringReplace(txt, "&", "&amp;");
   StringReplace(txt, "<", "&lt;");
   StringReplace(txt, ">", "&gt;");
   return txt;
  }

string SignalSideLine(bool ib, bool re=false)
  {
   string icon = ib ? "&#128994;" : "&#128308;";
   string dir  = ib ? "BUY" : "SELL";
   if(re) dir += " RE";
   return icon + " " + dir + " " + HtmlEscape(_Symbol);
  }

string SignalMessage(bool ib, bool re, datetime sig_time,
                     double entry, double sl, double tp1, double tp2, double tp3, double tp4,
                     double macd_val)
  {
   return StringFormat("&#128142; NEW SIGNAL | %s &#183; %s\n\n%s\n\n&#10145;&#65039; Entry  %s\n&#9940; SL     %s\n\n&#127919; TP1    %s\n&#127919; TP2    %s\n&#127919; TP3    %s\n&#127919; TP4    %s",
                       TFText(), TelegramTimeText(sig_time),
                       SignalSideLine(ib, re),
                       DoubleToString(entry, _Digits),
                       DoubleToString(sl, _Digits),
                       DoubleToString(tp1, _Digits),
                       DoubleToString(tp2, _Digits),
                       DoubleToString(tp3, _Digits),
                       DoubleToString(tp4, _Digits));
  }

string BuildResultMessage(int idx)
  {
   string head = SignalSideLine(g_signals[idx].is_buy, (g_signals[idx].is_reentry!=0)) + " |";
   string hits = "";

   for(int tp=1; tp<=4; tp++)
     {
      if(GetTPResult(idx,tp) == 1)
        {
         if(StringLen(hits) > 0) hits += " ";
         hits += "TP" + IntegerToString(tp) + " HIT &#9989;";
        }
     }

   if(StringLen(hits) <= 0)
      hits = "SL HIT &#10060;";

   return head + "\n&#160;&#160;&#160;&#160;&#160;" + hits;
  }

bool SignalResolved(int idx)
  {
   return (g_signals[idx].result_tp1!=0 &&
           g_signals[idx].result_tp2!=0 &&
           g_signals[idx].result_tp3!=0 &&
           g_signals[idx].result_tp4!=0);
  }

void MaybeReportSignal(int idx)
  {
   if(!InpUseTelegram || !InpReportResults) return;
   if(idx < 0 || idx >= g_signal_count) return;
   if(!g_signals[idx].is_live) return;
   if(g_signals[idx].reported) return;
   if(!SignalResolved(idx)) return;

   string msg = BuildResultMessage(idx);
   if(TelegramSendMessageReply(msg, g_signals[idx].tg_msg_id))
      g_signals[idx].reported = true;
  }

long SendTelegramSignal(bool ib, bool re, datetime sig_time,
                        double entry, double sl, double tp1, double tp2, double tp3, double tp4,
                        double macd_val)
  {
   if(!InpUseTelegram) return 0;
   string msg = SignalMessage(ib, re, sig_time, entry, sl, tp1, tp2, tp3, tp4, macd_val);
   long message_id = 0;
   if(InpSendChartImage) TelegramSendPhoto(msg, message_id);
   else TelegramSendMessage(msg, message_id);
   return message_id;
  }

void CreateOrUpdateTestButton()
  {
   if(!InpShowTestButton)
     {
      if(ObjectFind(0,g_test_button_name) >= 0) ObjectDelete(0,g_test_button_name);
      return;
     }
   if(ObjectFind(0,g_test_button_name) < 0)
     {
      ObjectCreate(0,g_test_button_name,OBJ_BUTTON,0,0,0);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_CORNER,CORNER_LEFT_UPPER);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_XSIZE,120);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_YSIZE,24);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_BGCOLOR,clrDarkSlateGray);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_COLOR,clrWhite);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_BORDER_COLOR,clrAqua);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_HIDDEN,true);
      ObjectSetInteger(0,g_test_button_name,OBJPROP_FONTSIZE,9);
      ObjectSetString(0,g_test_button_name,OBJPROP_FONT,"Arial");
      ObjectSetString(0,g_test_button_name,OBJPROP_TEXT,"Test Signal");
     }
   ObjectSetInteger(0,g_test_button_name,OBJPROP_XDISTANCE,InpTestButtonX);
   ObjectSetInteger(0,g_test_button_name,OBJPROP_YDISTANCE,InpTestButtonY);
  }

void SendTelegramTest()
  {
   double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(entry <= 0.0) entry = iClose(_Symbol, _Period, 0);
   if(entry <= 0.0) entry = 0.0;

   double step = MathMax(100.0 * _Point, MathAbs(entry) * 0.0005);
   double sl   = NormalizeDouble(entry - step*2.0, _Digits);
   double tp1  = NormalizeDouble(entry + step*1.0, _Digits);
   double tp2  = NormalizeDouble(entry + step*2.0, _Digits);
   double tp3  = NormalizeDouble(entry + step*3.0, _Digits);
   double tp4  = NormalizeDouble(entry + step*4.0, _Digits);
   entry = NormalizeDouble(entry, _Digits);
   datetime test_time = TimeLocal();
   if(test_time <= 0) test_time = TimeCurrent();

   string msg = SignalMessage(true, false, TimeCurrent(), entry, sl, tp1, tp2, tp3, tp4, 0.0);
   long message_id = 0;
   if(InpSendChartImage) TelegramSendPhoto(msg, message_id);
   else TelegramSendMessage(msg, message_id);

   if(message_id > 0)
     {
      string result_msg = SignalSideLine(true, false) + " |\n&#160;&#160;&#160;&#160;&#160;TP1 HIT &#9989; TP2 HIT &#9989;";
      TelegramSendMessageReply(result_msg, message_id);
     }

   // Website Sync: ส่ง test signal + market snapshot ไป backend ด้วย (ปิดได้ด้วย InpUseWebsiteSync)
   PrintFormat("Trend_Follow_M5M1: Test Signal clicked | WebsiteSync=%s url=%s api_key_len=%d",
               InpUseWebsiteSync ? "true" : "false",
               InpWebsiteApiUrl,
               StringLen(InpWebsiteApiKey));
   if(WebsiteReady())
     {
      // Test signal: add เข้า g_signals[] จริง ๆ เพื่อให้ WebsiteBuildSignalObjectsJson(idx)
      // สร้าง visible objects payload (arrow/rr_box/level_*) ได้ และ bulk sync จะได้เห็นด้วย
      // is_live=true เพื่อให้ CreateSignalObjects วาดบน MT5 + objects_created=true
      int pre_count = g_signal_count;
      AddSignal(true, false, test_time, test_time, entry, sl, tp1, tp2, tp3, tp4, true);
      int sig_idx = (g_signal_count > pre_count) ? g_signal_count - 1 : -1;

      if(sig_idx >= 0)
        {
         WebsiteSendSignal(true, false, test_time, entry, sl, tp1, tp2, tp3, tp4, 0.0, sig_idx);
         if(InpDebugSignals)
            PrintFormat("Trend_Follow_M5M1: [WebSync] Test signal added at idx=%d, objects attached", sig_idx);
        }
      else
        {
         // fallback: ถ้า add ไม่สำเร็จ (MAX_SIGNALS) ส่ง legacy ไม่มี objects
         WebsiteSendSignal(true, false, test_time, entry, sl, tp1, tp2, tp3, tp4, 0.0, -1);
        }
      WebsiteSendChartMeta();
      WebsiteSendMarket();
     }
   else
      Print("Trend_Follow_M5M1: Test Signal skipped Website Sync because WebsiteReady=false.");
  }

//==================================================================
// WEBSITE SYNC HELPERS  (HTTP POST JSON to Tradertoolsth backend)
// แยกขาดจาก Telegram ปิด/เปิดได้ด้วย InpUseWebsiteSync
// ใช้ WebRequest 7-arg เหมือน Telegram helpers แต่ Content-Type: application/json
//==================================================================
bool WebsiteReady()
  {
   if(!InpUseWebsiteSync) return false;
   string url = InpWebsiteApiUrl;
   if(StringLen(url) < 8) return false;
   string lower = url;
   StringToLower(lower);
   if(StringFind(lower, "http://") != 0 && StringFind(lower, "https://") != 0)
     {
      Print("Trend_Follow_M5M1: WebsiteApiUrl must start with http:// or https://");
      return false;
     }
   return true;
  }

//--- Escape สตริงสำหรับใส่ในค่า JSON string (double-quote, backslash, control chars)
string JsonEscape(const string s)
  {
   string out = "";
   int n = StringLen(s);
   for(int i=0; i<n; i++)
     {
      ushort ch = StringGetCharacter(s, i);
      if(ch=='"')       out += "\\\"";
      else if(ch=='\\') out += "\\\\";
      else if(ch=='\n') out += "\\n";
      else if(ch=='\r') out += "\\r";
      else if(ch=='\t') out += "\\t";
      else if(ch < 0x20) out += StringFormat("\\u%04x", (int)ch);
      else              out += ShortToString(ch);
     }
   return out;
  }

//--- ตัด trailing slash ของ base URL
string WebsiteBase()
  {
   string b = InpWebsiteApiUrl;
   while(StringLen(b) > 0 && StringGetCharacter(b, StringLen(b)-1) == '/')
      b = StringSubstr(b, 0, StringLen(b)-1);
   return b;
  }

//--- POST JSON ไปยัง path (เช่น "/api/signal") คืน true ถ้า HTTP 2xx
bool WebsitePostJson(const string path, const string json_body)
  {
   if(!WebsiteReady()) return false;

   char data[], result[];
   string result_headers;
   int data_len = StringToCharArray(json_body, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(data_len > 0) ArrayResize(data, data_len-1); // drop trailing NUL

   string url = WebsiteBase() + path;
   string headers = "Content-Type: application/json\r\n"
                    "x-api-key: " + InpWebsiteApiKey + "\r\n"
                    "X-EA-Source: Trend_Follow_M5M1\r\n";
   ResetLastError();
   int code = WebRequest("POST", url, headers, InpWebsiteTimeout, data, result, result_headers);
   string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   if(code < 200 || code >= 300)
     {
      PrintFormat("Trend_Follow_M5M1: Website POST %s failed. HTTP=%d Error=%d Response=%s",
                  path, code, GetLastError(), response);
      if(code == -1)
         Print("Trend_Follow_M5M1: Add " + WebsiteBase() +
               " in Tools > Options > Expert Advisors > Allow WebRequest for listed URL.");
      return false;
     }
   if(InpDebugSignals)
      PrintFormat("Trend_Follow_M5M1: Website POST %s OK. HTTP=%d Response=%s", path, code, response);
   return true;
  }

//--- สร้าง id ของสัญญาณ (เหมือน backend ใช้ตอน UPSERT)
string WebsiteSignalId(datetime sig_time)
  {
   // id รวม magic + timeframe + bar_time เพื่อให้ M1/M5 ของ symbol เดียวกันไม่ชนกัน
   return IntegerToString((long)InpMagicNumber) + "-" + TFText() + "-" + IntegerToString((long)sig_time);
  }

//--- สร้าง JSON payload สัญญาณใหม่ (รวม timeframe ของ chart instance)
string WebsiteBuildSignalJson(bool ib, bool re, datetime sig_time,
                              double entry, double sl,
                              double tp1, double tp2, double tp3, double tp4,
                              double macd_val)
  {
   string id = WebsiteSignalId(sig_time);
   string dir = ib ? "BUY" : "SELL";
   return StringFormat(
     "{\"id\":\"%s\",\"symbol\":\"%s\",\"timeframe\":\"%s\",\"direction\":\"%s\",\"signal_time\":%I64u,"
     "\"entry\":%s,\"sl\":%s,\"tp1\":%s,\"tp2\":%s,\"tp3\":%s,\"tp4\":%s,"
     "\"macd\":%s,\"is_reentry\":%s,\"source\":\"Trend_Follow_M5M1\"}",
     JsonEscape(id), JsonEscape(_Symbol), JsonEscape(TFText()), dir, (long)sig_time,
     DoubleToString(entry, _Digits), DoubleToString(sl, _Digits),
     DoubleToString(tp1, _Digits), DoubleToString(tp2, _Digits),
     DoubleToString(tp3, _Digits), DoubleToString(tp4, _Digits),
     DoubleToString(macd_val, 6), re ? "true" : "false");
  }

//--- สร้าง JSON payload สถานะสัญญาณ (TP/SL) — แนบ timeframe เพื่อ backend ระบุ instance
string WebsiteBuildStatusJson(int idx)
  {
   string id    = WebsiteSignalId(g_signals[idx].signal_bar_time);
   string status= "ACTIVE";
   string result= "OPEN";
   // result text mapping: open/win/loss -> result + status text
   if(g_signals[idx].result == 1)      { result = "WIN";  }
   else if(g_signals[idx].result == -1){ result = "LOSS"; }

   // status text ตาม TP ที่ hit ล่าสุด (1..4) หรือ SL
   int last_hit = 0;
   for(int tp=1; tp<=4; tp++)
      if(GetTPResult(idx, tp) == 1) last_hit = tp;
   bool sl_hit = (g_signals[idx].result == -1);

   if(sl_hit)                          status = "SL HIT";
   else if(last_hit >= 1)              status = "TP" + IntegerToString(last_hit) + " HIT";

   return StringFormat(
     "{\"id\":\"%s\",\"symbol\":\"%s\",\"timeframe\":\"%s\",\"status\":\"%s\",\"result\":\"%s\","
     "\"tp1_status\":%d,\"tp2_status\":%d,\"tp3_status\":%d,\"tp4_status\":%d}",
     JsonEscape(id), JsonEscape(_Symbol), JsonEscape(TFText()), status, result,
     GetTPResult(idx,1), GetTPResult(idx,2), GetTPResult(idx,3), GetTPResult(idx,4));
  }

//--- สร้าง JSON array ของแท่งเทียน timeframe tf ("M1"/"M5")
string WebsiteBuildCandlesJson(ENUM_TIMEFRAMES tf, int count)
  {
   if(count <= 0) count = 60;
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(_Symbol, tf, 1, count, rates);
   if(copied <= 0) return "[]";
   string s = "[";
   for(int i=copied-1; i>=0; i--)
     {
      if(i < copied-1) s += ",";
      s += StringFormat("{\"time\":%I64u,\"open\":%s,\"high\":%s,\"low\":%s,\"close\":%s}",
                        (long)rates[i].time,
                        DoubleToString(rates[i].open,  _Digits),
                        DoubleToString(rates[i].high,  _Digits),
                        DoubleToString(rates[i].low,   _Digits),
                        DoubleToString(rates[i].close, _Digits));
     }
   s += "]";
   return s;
  }

//--- สร้าง JSON payload market snapshot (ราคา + OHLC ของ timeframe ปัจจุบัน)
//    ส่ง candles ใน field "candles" ตาม timeframe ของ chart instance นี้เท่านั้น
//    ห้ามปนข้าม timeframe: M1 chart ส่ง candles=M1, M5 chart ส่ง candles=M5
string WebsiteBuildMarketJson()
  {
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   long   spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   datetime now = TimeCurrent();
   // ใช้ timeframe ของ chart instance ปัจจุบัน (_Period) เท่านั้น
   string candles = WebsiteBuildCandlesJson(_Period, InpWebsiteCandles);
   return StringFormat(
     "{\"symbol\":\"%s\",\"timeframe\":\"%s\",\"bid\":%s,\"ask\":%s,\"spread\":%I64d,\"broker_time\":%I64u,"
     "\"candles\":%s}",
     JsonEscape(_Symbol), JsonEscape(TFText()),
     DoubleToString(bid, _Digits), DoubleToString(ask, _Digits),
     spread, (long)now, candles);
  }

//--- public send wrappers
//    sig_idx = index ใน g_signals[] ของ signal ที่เพิ่ง add (ส่ง visible objects ไปด้วย)
//    ส่ง -1 ถ้าไม่ทราบ idx → ไม่แนบ objects (legacy path)
void WebsiteSendSignal(bool ib, bool re, datetime sig_time,
                       double entry, double sl,
                       double tp1, double tp2, double tp3, double tp4,
                       double macd_val, int sig_idx = -1)
  {
   if(!WebsiteReady()) return;
   string json = WebsiteBuildSignalJson(ib, re, sig_time, entry, sl, tp1, tp2, tp3, tp4, macd_val);
   // แนบ objects payload (1:1 กับ MT5) ถ้าทราบ idx
   if(sig_idx >= 0)
     {
      string objects_json = WebsiteBuildSignalObjectsJson(sig_idx);
      // แทรก objects ก่อนปีกกาปิด
      int pos = StringFind(json, ",\"source\":");
      if(pos > 0)
         json = StringSubstr(json, 0, pos) + ",\"objects\":" + objects_json + StringSubstr(json, pos);
     }
   if(InpDebugSignals)
      PrintFormat("Trend_Follow_M5M1: [WebSync] signal %s %s id=%s entry=%.5f sl=%.5f tp1=%.5f tp2=%.5f tp3=%.5f tp4=%.5f sig_time=%I64u objects_idx=%d",
                  _Symbol, ib?"BUY":"SELL", WebsiteSignalId(sig_time),
                  entry, sl, tp1, tp2, tp3, tp4, (long)sig_time, sig_idx);
   WebsitePostJson("/api/signal", json);
   // sync chart_meta ทุกครั้งที่มี signal ใหม่ (กันกรณี user เพิ่งเปลี่ยน inputs)
   WebsiteSendChartMeta();
  }

void WebsiteSendStatus(int idx)
  {
   if(!WebsiteReady()) return;
   if(idx < 0 || idx >= g_signal_count) return;
   string json = WebsiteBuildStatusJson(idx);
   if(InpDebugSignals)
     {
      string id    = WebsiteSignalId(g_signals[idx].signal_bar_time);
      string result= (g_signals[idx].result==1)?"WIN":((g_signals[idx].result==-1)?"LOSS":"OPEN");
      int last_hit = 0;
      for(int tp=1; tp<=4; tp++)
         if(GetTPResult(idx, tp) == 1) last_hit = tp;
      string status = (g_signals[idx].result==-1) ? "SL HIT" : (last_hit>=1 ? "TP"+IntegerToString(last_hit)+" HIT" : "ACTIVE");
      PrintFormat("Trend_Follow_M5M1: [WebSync] status id=%s result=%s status=%s tp1=%d tp2=%d tp3=%d tp4=%d",
                  id, result, status,
                  GetTPResult(idx,1), GetTPResult(idx,2), GetTPResult(idx,3), GetTPResult(idx,4));
     }
   WebsitePostJson("/api/status", json);
  }

void WebsiteSendMarket()
  {
   if(!WebsiteReady()) return;
   string json = WebsiteBuildMarketJson();
   WebsitePostJson("/api/market", json);
  }

//--- Map ENUM_DASH_WIN_TARGET -> readable string สำหรับ chart_meta payload
string WinTargetText()
  {
   switch(InpDashWinTarget)
     {
      case DASH_WIN_TP1: return "TP1";
      case DASH_WIN_TP2: return "TP2";
      case DASH_WIN_TP3: return "TP3";
      case DASH_WIN_TP4: return "TP4";
      default:           return "NONE";
     }
  }

//--- Build chart_meta payload (visual config ของ chart instance ปัจจุบัน)
//    เว็บใช้ render ตาม 1:1 โดยไม่ต้องเดา (extend_bars, win_target, show_* flags)
string WebsiteBuildChartMetaJson()
  {
   return StringFormat(
     "{\"symbol\":\"%s\",\"timeframe\":\"%s\","
     "\"extend_bars\":%d,\"text_offset_bars\":%d,\"win_target\":\"%s\","
     "\"show_rr_boxes\":%s,\"show_entry\":%s,\"show_sl\":%s,"
     "\"show_tp1\":%s,\"show_tp2\":%s,\"show_tp3\":%s,\"show_tp4\":%s,"
     "\"max_hist_signals\":%d,\"broker_time\":%I64u}",
     JsonEscape(_Symbol), JsonEscape(TFText()),
     (int)MathMax(1, InpSigExtendBars), (int)InpSigTextOffsetBars, WinTargetText(),
     InpShowRRBoxes ? "true":"false",
     InpShowEntry   ? "true":"false",
     InpShowSL      ? "true":"false",
     InpShowTP1     ? "true":"false",
     InpShowTP2     ? "true":"false",
     InpShowTP3     ? "true":"false",
     InpShowTP4     ? "true":"false",
     (int)InpMaxHistSignals,
     (long)TimeCurrent());
  }

//--- ส่ง chart_meta ไป backend (POST /api/chart_meta)
void WebsiteSendChartMeta()
  {
   if(!WebsiteReady()) return;
   string json = WebsiteBuildChartMetaJson();
   WebsitePostJson("/api/chart_meta", json);
  }

//--- สร้าง visible objects payload ของ signal idx (1:1 กับที่ MT5 วาดจริง)
//    ใช้เว็บ render โดยไม่ต้องคำนวณ geometry เอง — time2 คำนวณใน EA
//    visibility แต่ละ field ขึ้นกับ InpShow* ของ EA จริง
string WebsiteBuildSignalObjectsJson(int idx)
  {
   if(idx < 0 || idx >= g_signal_count) return "null";

   bool ib       = (g_signals[idx].is_buy != 0);
   double ep     = g_signals[idx].entry;
   datetime st   = g_signals[idx].signal_bar_time;
   int tf_secs   = PeriodSeconds(_Period);
   datetime t2   = st + (datetime)(tf_secs * MathMax(1, InpSigExtendBars));

   // arrow (วาดเสมอใน MT5 — ไม่ขึ้นกับ flag)
   int arw_code  = ib ? 233 : 234;
   string arrow  = StringFormat("{\"time\":%I64u,\"price\":%s,\"code\":%d,\"is_buy\":%s}",
                                (long)st, DoubleToString(ep, _Digits), arw_code, ib?"true":"false");

   // RR box — เฉพาะเมื่อ InpShowRRBoxes && InpDashWinTarget != NONE && target_tp valid
   string rr_box = "null";
   if(InpShowRRBoxes && InpDashWinTarget != DASH_WIN_NONE)
     {
      double target_tp = GetWinTP(idx);
      if(target_tp != EMPTY_VALUE)
        {
         double hi = MathMax(ep, target_tp);
         double lo = MathMin(ep, target_tp);
         rr_box = StringFormat("{\"time1\":%I64u,\"time2\":%I64u,\"hi\":%s,\"lo\":%s}",
                               (long)st, (long)t2, DoubleToString(hi, _Digits), DoubleToString(lo, _Digits));
        }
     }

   // helper สำหรับ level line แต่ละอัน (time1/time2/price หรือ null)
   string level_e = "null";
   if(InpShowEntry)
      level_e = StringFormat("{\"time1\":%I64u,\"time2\":%I64u,\"price\":%s}",
                             (long)st, (long)t2, DoubleToString(ep, _Digits));

   string level_sl = "null";
   if(InpShowSL)
      level_sl = StringFormat("{\"time1\":%I64u,\"time2\":%I64u,\"price\":%s}",
                              (long)st, (long)t2, DoubleToString(g_signals[idx].sl, _Digits));

   string level_tp1 = "null";
   if(InpShowTP1)
      level_tp1 = StringFormat("{\"time1\":%I64u,\"time2\":%I64u,\"price\":%s}",
                               (long)st, (long)t2, DoubleToString(g_signals[idx].tp1, _Digits));
   string level_tp2 = "null";
   if(InpShowTP2)
      level_tp2 = StringFormat("{\"time1\":%I64u,\"time2\":%I64u,\"price\":%s}",
                               (long)st, (long)t2, DoubleToString(g_signals[idx].tp2, _Digits));
   string level_tp3 = "null";
   if(InpShowTP3)
      level_tp3 = StringFormat("{\"time1\":%I64u,\"time2\":%I64u,\"price\":%s}",
                               (long)st, (long)t2, DoubleToString(g_signals[idx].tp3, _Digits));
   string level_tp4 = "null";
   if(InpShowTP4)
      level_tp4 = StringFormat("{\"time1\":%I64u,\"time2\":%I64u,\"price\":%s}",
                               (long)st, (long)t2, DoubleToString(g_signals[idx].tp4, _Digits));

   return StringFormat(
     "{\"arrow\":%s,\"rr_box\":%s,"
     "\"level_e\":%s,\"level_sl\":%s,"
     "\"level_tp1\":%s,\"level_tp2\":%s,\"level_tp3\":%s,\"level_tp4\":%s,"
     "\"text_offset_bars\":%d}",
     arrow, rr_box,
     level_e, level_sl,
     level_tp1, level_tp2, level_tp3, level_tp4,
     (int)InpSigTextOffsetBars);
  }

//--- Build DR zones payload — sync R2/R1 resistance + S1/S2 support ของ current segment
//    ใช้เว็บวาดกล่องแดง/เขียวใหญ่เหมือน MT5 (เดิม frontend เดาเอง → ผิด)
//    sync เฉพาะ latest segment เพื่อกัน payload ใหญ่ (historical rebuild ทุก bar อยู่แล้ว)
string WebsiteBuildZonesJson()
  {
   double r2v, r1v, s1v, s2v, avg_v;
   datetime zone_start;
   if(!GetCurrentZone(r2v, r1v, s1v, s2v, avg_v, zone_start))
      return "{\"symbol\":\"" + _Symbol + "\",\"timeframe\":\"" + TFText() + "\",\"zones\":[]}";

   int psec = (int)PeriodSeconds(_Period);
   if(psec <= 0) psec = 60;
   datetime now = TimeCurrent();
   datetime t1 = zone_start;
   // t2 = current bar + extend bars (เหมือน RebuildZoneObjects)
   datetime t2 = now + (datetime)(psec * MathMax(1, InpZoneExtendBars));

   string s = StringFormat(
     "{\"symbol\":\"%s\",\"timeframe\":\"%s\",\"broker_time\":%I64u,\"zones\":[",
     JsonEscape(_Symbol), JsonEscape(TFText()), (long)now);

   // resistance zone (R2..R1)
   s += StringFormat("{\"type\":\"resistance\",\"time1\":%I64u,\"time2\":%I64u,\"hi\":%s,\"lo\":%s,\"color\":\"red\"},",
                     (long)t1, (long)t2, DoubleToString(r2v, _Digits), DoubleToString(r1v, _Digits));
   // support zone (S1..S2)
   s += StringFormat("{\"type\":\"support\",\"time1\":%I64u,\"time2\":%I64u,\"hi\":%s,\"lo\":%s,\"color\":\"green\"}",
                     (long)t1, (long)t2, DoubleToString(s1v, _Digits), DoubleToString(s2v, _Digits));

   s += "]}";
   return s;
  }

//--- ส่ง DR zones ไป backend (POST /api/zones)
void WebsiteSendZones()
  {
   if(!WebsiteReady()) return;
   if(!InpShowZones) return;  // ปิดได้ด้วย flag เดียวกับ MT5
   string json = WebsiteBuildZonesJson();
   WebsitePostJson("/api/zones", json);
  }

//--- Bulk sync: ส่งสัญญาณล่าสุด N อัน ไปยัง backend (จำกัดไม่ให้ EA ค้าง)
//    เรียกหลัง ScanHistoricalSignals() เพื่อเติมข้อมูลย้อนหลังให้ dashboard
void WebsiteSyncAllSignals()
  {
   if(!WebsiteReady()) return;
   if(g_signal_count <= 0) return;

   // จำกัดแค่ 100 สัญญาณล่าสุด (เรียงจากใหม่ → เก่า)
   // ป้องกัน EA ค้างเมื่อมีสัญญาณเป็นร้อยๆ
   int max_sync  = 100;
   int batch_size = 50;
   int total_sent = 0;

   // คำนวณ start index (เริ่มจาก signal ใหม่ → เก่า)
   int start_idx = MathMax(0, g_signal_count - max_sync);

   for(int batch_start = start_idx; batch_start < g_signal_count; batch_start += batch_size)
     {
      int batch_end = MathMin(batch_start + batch_size, g_signal_count);
      string json = "{\"signals\":[";

      for(int i = batch_start; i < batch_end; i++)
        {
         if(i > batch_start) json += ",";

         string id  = WebsiteSignalId(g_signals[i].signal_bar_time);
         string dir = g_signals[i].is_buy ? "BUY" : "SELL";

         string status = "ACTIVE";
         string result = "OPEN";
         if(g_signals[i].result == 1)       result = "WIN";
         else if(g_signals[i].result == -1) result = "LOSS";

         int last_hit = 0;
         for(int tp = 1; tp <= 4; tp++)
            if(GetTPResult(i, tp) == 1) last_hit = tp;
         bool sl_hit = (g_signals[i].result == -1);

         if(sl_hit)               status = "SL HIT";
         else if(last_hit >= 1)   status = "TP" + IntegerToString(last_hit) + " HIT";

         json += StringFormat(
           "{\"id\":\"%s\",\"symbol\":\"%s\",\"timeframe\":\"%s\",\"direction\":\"%s\","
           "\"signal_time\":%I64u,\"entry\":%s,\"sl\":%s,"
           "\"tp1\":%s,\"tp2\":%s,\"tp3\":%s,\"tp4\":%s,"
           "\"macd\":0.0,\"is_reentry\":%s,\"source\":\"Trend_Follow_M5M1\","
           "\"status\":\"%s\",\"result\":\"%s\","
           "\"tp1_status\":%d,\"tp2_status\":%d,\"tp3_status\":%d,\"tp4_status\":%d,"
           "\"objects\":%s}",
           JsonEscape(id), JsonEscape(_Symbol), JsonEscape(TFText()), dir,
           (long)g_signals[i].signal_bar_time,
           DoubleToString(g_signals[i].entry, _Digits),
           DoubleToString(g_signals[i].sl, _Digits),
           DoubleToString(g_signals[i].tp1, _Digits),
           DoubleToString(g_signals[i].tp2, _Digits),
           DoubleToString(g_signals[i].tp3, _Digits),
           DoubleToString(g_signals[i].tp4, _Digits),
           g_signals[i].is_reentry ? "true" : "false",
           status, result,
           GetTPResult(i,1), GetTPResult(i,2), GetTPResult(i,3), GetTPResult(i,4),
           WebsiteBuildSignalObjectsJson(i));
        }

      json += "]}";

      if(WebsitePostJson("/api/signal/bulk", json))
         total_sent += (batch_end - batch_start);
     }

   PrintFormat("Trend_Follow_M5M1: [WebSync] Bulk synced %d signals (last %d of %d total)",
               total_sent, max_sync, g_signal_count);

   // ส่ง chart_meta ท้าย bulk sync (visual config ของ chart instance ปัจจุบัน)
   WebsiteSendChartMeta();
  }

//==================================================================
// OBJECT NAME HELPERS
//==================================================================
string ZRectName(string side, datetime t)
  { return g_zpfx+"R"+side+"_"+IntegerToString((long)t); }
string ZAvgName(datetime t)
  { return g_zpfx+"A_"+IntegerToString((long)t); }

string SigBase(int idx)
  {
   string dir = g_signals[idx].is_buy ? "B" : "S";
   string re  = g_signals[idx].is_reentry ? "R" : "F";
   return g_spfx + dir + re + "_" +
          IntegerToString((long)g_signals[idx].zone_start_time) + "_" +
          IntegerToString((long)g_signals[idx].signal_bar_time);
  }

//==================================================================
// DR SERIES BUILDER
//==================================================================
int BuildDRSeries(int want_bars,
                  double &r2[], double &r1[], double &av[],
                  double &s1[], double &s2[], datetime &tm[])
  {
   int bars_total  = Bars(_Symbol, _Period);
   int closed_bars = bars_total - 1;
   if(closed_bars <= InpDRLength+2) return 0;

   int need = MathMin(MathMax(closed_bars, want_bars+InpDRLength+200), closed_bars);

   double cls_arr[], atr_arr[];
   datetime time_arr[];
   ArraySetAsSeries(cls_arr,  true);
   ArraySetAsSeries(atr_arr,  true);
   ArraySetAsSeries(time_arr, true);

   int cc = CopyClose (_Symbol, _Period, 1, need, cls_arr);
   int ca = CopyBuffer(g_atr_handle, 0, 1, need, atr_arr);
   int ct = CopyTime  (_Symbol, _Period, 1, need, time_arr);

   if(cc<InpDRLength+10 || ca<InpDRLength+10 || ct<InpDRLength+10)
     {
      need = MathMin(closed_bars, InpDRLength*3+300);
      cc = CopyClose (_Symbol, _Period, 1, need, cls_arr);
      ca = CopyBuffer(g_atr_handle, 0, 1, need, atr_arr);
      ct = CopyTime  (_Symbol, _Period, 1, need, time_arr);
     }

   int copied = (int)MathMin(MathMin(cc,ca),ct);
   if(copied <= InpDRLength+2) return 0;

   ArraySetAsSeries(r2,true); ArraySetAsSeries(r1,true);
   ArraySetAsSeries(av,true); ArraySetAsSeries(s1,true);
   ArraySetAsSeries(s2,true); ArraySetAsSeries(tm,true);
   ArrayResize(r2,copied); ArrayResize(r1,copied);
   ArrayResize(av,copied); ArrayResize(s1,copied);
   ArrayResize(s2,copied); ArrayResize(tm,copied);
   ArrayCopy(tm, time_arr, 0, 0, copied);
   for(int i=0; i<copied; i++)
      r2[i]=r1[i]=av[i]=s1[i]=s2[i]=EMPTY_VALUE;

   int oldest = copied-1;
   double avg_val = cls_arr[oldest], hold_atr = 0.0;
   for(int i=oldest-1; i>=0; i--)
     {
      double atr = atr_arr[i] * InpDRMult;
      if(atr==EMPTY_VALUE || atr<=0.0) continue;
      double prev_avg=avg_val, src=cls_arr[i];
      if(src-avg_val>atr)      avg_val+=atr;
      else if(avg_val-src>atr) avg_val-=atr;
      if(avg_val!=prev_avg)    hold_atr=atr/2.0;
      if(hold_atr>0.0)
        {
         av[i]=avg_val;
         r2[i]=avg_val+hold_atr*2.0;
         r1[i]=avg_val+hold_atr;
         s1[i]=avg_val-hold_atr;
         s2[i]=avg_val-hold_atr*2.0;
        }
     }
   return copied;
  }

//==================================================================
// ZONE DISPLAY
//==================================================================
void DrawZonePair(datetime t1, datetime t2,
                  double r2v, double r1v, double s1v, double s2v, double avg_v)
  {
   if(InpShowZones)
     {
      color rc  = BlendColor(InpResistColor,  InpZoneTransparency);
      color sc  = BlendColor(InpSupportColor, InpZoneTransparency);

      ObjRect(ZRectName("R",t1), t1, t2, r2v, r1v, rc);
      ObjRect(ZRectName("S",t1), t1, t2, s1v, s2v, sc);
     }

   if(InpShowZoneMidlines)
      ObjTrend(ZAvgName(t1), t1, avg_v, t2, avg_v, clrGray, STYLE_DOT, 1, false, true);
  }

void RebuildZoneObjects()
  {
   double r2a[],r1a[],ava[],s1a[],s2a[];
   datetime tma[];
   int copied = BuildDRSeries(InpZoneHistoryBars, r2a,r1a,ava,s1a,s2a,tma);
   if(copied <= 0) return;

   DeleteByPrefix(g_zpfx);

   int psec = (int)PeriodSeconds(_Period);
   if(psec <= 0) psec = 60;
   int oldest_draw = MathMin(copied-1, InpZoneHistoryBars-1);

   int    seg_start  = -1;
   double seg_avg    = EMPTY_VALUE;
   double seg_r2=0, seg_r1=0, seg_s1=0, seg_s2=0;
   datetime seg_t1   = 0;
   datetime seg_last = 0;

   for(int i=oldest_draw; i>=0; i--)
     {
      if(ava[i]==EMPTY_VALUE) continue;

      bool new_seg = (seg_start<0 || ava[i]!=seg_avg);
      if(new_seg)
        {
         if(seg_start>=0 && seg_last>0)
            DrawZonePair(seg_t1, seg_last+(datetime)psec,
                         seg_r2, seg_r1, seg_s1, seg_s2, seg_avg);

         seg_start = i;
         seg_avg   = ava[i];
         seg_t1    = tma[i];
         seg_r2=r2a[i]; seg_r1=r1a[i];
         seg_s1=s1a[i]; seg_s2=s2a[i];
        }
      seg_last = tma[i];
     }

   if(seg_start >= 0)
     {
      datetime t2 = tma[0] + (datetime)(psec*(MathMax(1,InpZoneExtendBars)+1));
      DrawZonePair(seg_t1, t2, seg_r2, seg_r1, seg_s1, seg_s2, seg_avg);
     }

   ChartRedraw(0);
  }

//==================================================================
// MACD & ZONE HELPERS
//==================================================================
double GetMACDMain(int shift)
  {
   if(g_macd_handle==INVALID_HANDLE) return EMPTY_VALUE;
   double buf[1];
   if(CopyBuffer(g_macd_handle, 0, shift, 1, buf) <= 0) return EMPTY_VALUE;
   return buf[0];
  }

bool GetCurrentZone(double &r2v, double &r1v, double &s1v, double &s2v,
                    double &avg_v, datetime &zone_start)
  {
   double r2a[],r1a[],ava[],s1a[],s2a[];
   datetime tma[];
   int need = MathMax(500, InpDRLength*2+50);
   int copied = BuildDRSeries(need, r2a,r1a,ava,s1a,s2a,tma);
   if(copied<=0 || ava[0]==EMPTY_VALUE) return false;

   avg_v = ava[0];
   r2v=r2a[0]; r1v=r1a[0]; s1v=s1a[0]; s2v=s2a[0];
   zone_start = tma[0];

   for(int i=1; i<copied; i++)
     {
      if(ava[i]==EMPTY_VALUE || ava[i]!=avg_v) break;
      zone_start = tma[i];
     }
   return true;
  }

//==================================================================
// ZONE SIGNAL TRACKING
//==================================================================
int FindZSigIdx(datetime zs)
  {
   for(int i=0; i<g_zsig_count; i++)
      if(g_zsigs[i].zone_start==zs) return i;
   return -1;
  }

int FindZSigByPrice(bool ib, double entry)
  {
   double tol = MathMax(_Point*10.0, MathAbs(entry)*0.00005);
   for(int i=0; i<g_zsig_count; i++)
     {
      double zentry = ib ? g_zsigs[i].buy_entry : g_zsigs[i].sell_entry;
      if(zentry > 0.0 && MathAbs(zentry-entry) <= tol)
         return i;
     }
   return -1;
  }

bool PriceRangesOverlap(double a1, double a2, double b1, double b2)
  {
   double amin = MathMin(a1,a2), amax = MathMax(a1,a2);
   double bmin = MathMin(b1,b2), bmax = MathMax(b1,b2);
   double tol = MathMax(_Point*10.0, MathMin(amax-amin, bmax-bmin)*0.25);
   return (MathMax(amin,bmin) <= MathMin(amax,bmax) + tol);
  }

bool ExistingSignalInSamePriceZone(bool ib, double entry, double sl, datetime sig_time)
  {
   if(!InpOneSignalPerZone) return false;
   int sec = PeriodSeconds(_Period);
   if(sec <= 0) sec = 60;
   int lookback_bars = MathMax(120, InpZoneExtendBars*2);
   datetime cutoff = sig_time - (datetime)(sec * lookback_bars);
   for(int i=g_signal_count-1; i>=0; i--)
     {
      if(g_signals[i].is_reentry!=0) continue;
      if(g_signals[i].signal_bar_time < cutoff) break;
      if(PriceRangesOverlap(entry, sl, g_signals[i].entry, g_signals[i].sl))
         return true;
     }
   return false;
  }

void EnsureZSig(datetime zs)
  {
   if(FindZSigIdx(zs)>=0) return;
   if(g_zsig_count>=ArraySize(g_zsigs))
      ArrayResize(g_zsigs, g_zsig_count+64);
   int n = g_zsig_count;
   g_zsigs[n].zone_start      = zs;
   g_zsigs[n].buy_entry       = 0.0; g_zsigs[n].sell_entry = 0.0;
   g_zsigs[n].had_buy_first   = false; g_zsigs[n].had_sell_first   = false;
   g_zsigs[n].had_buy_reentry = false; g_zsigs[n].had_sell_reentry = false;
   g_zsigs[n].buy_reentry_armed = false; g_zsigs[n].sell_reentry_armed = false;
   g_zsig_count++;
  }

void BindZSigEntry(datetime zs, bool ib, double entry)
  {
   EnsureZSig(zs);
   int idx = FindZSigIdx(zs);
   if(idx < 0) return;
   if(ib) g_zsigs[idx].buy_entry = entry;
   else   g_zsigs[idx].sell_entry = entry;
  }

bool CanFireBuy(datetime zs, bool re)
  {
   EnsureZSig(zs);
   int idx = FindZSigIdx(zs);
   if(!re)
     {
      if(!InpOneSignalPerZone) return true;
      return (!g_zsigs[idx].had_buy_first && !g_zsigs[idx].had_sell_first);
     }
   return  g_zsigs[idx].had_buy_first && g_zsigs[idx].buy_reentry_armed && !g_zsigs[idx].had_buy_reentry;
  }

bool CanFireBuyAt(datetime zs, bool re, double entry, double sl, datetime sig_time)
  {
   if(!re && ExistingSignalInSamePriceZone(true, entry, sl, sig_time))
      return false;
   int price_idx = FindZSigByPrice(true, entry);
   if(price_idx >= 0 && g_zsigs[price_idx].zone_start != zs)
     {
      if(!re) return (!InpOneSignalPerZone);
      return false;
     }
   return CanFireBuy(zs,re);
  }

bool CanFireSell(datetime zs, bool re)
  {
   EnsureZSig(zs);
   int idx = FindZSigIdx(zs);
   if(!re)
     {
      if(!InpOneSignalPerZone) return true;
      return (!g_zsigs[idx].had_buy_first && !g_zsigs[idx].had_sell_first);
     }
   return  g_zsigs[idx].had_sell_first && g_zsigs[idx].sell_reentry_armed && !g_zsigs[idx].had_sell_reentry;
  }

bool CanFireSellAt(datetime zs, bool re, double entry, double sl, datetime sig_time)
  {
   if(!re && ExistingSignalInSamePriceZone(false, entry, sl, sig_time))
      return false;
   int price_idx = FindZSigByPrice(false, entry);
   if(price_idx >= 0 && g_zsigs[price_idx].zone_start != zs)
     {
      if(!re) return (!InpOneSignalPerZone);
      return false;
     }
   return CanFireSell(zs,re);
  }

void ArmReentry(datetime zs, bool ib)
  {
   EnsureZSig(zs);
   int idx = FindZSigIdx(zs);
   if(ib)
      g_zsigs[idx].buy_reentry_armed = true;
   else
      g_zsigs[idx].sell_reentry_armed = true;
  }

void MarkFired(datetime zs, bool ib, bool re)
  {
   EnsureZSig(zs);
   int idx = FindZSigIdx(zs);
   if(ib)
     { if(!re) g_zsigs[idx].had_buy_first=true;  else g_zsigs[idx].had_buy_reentry=true;  }
   else
     { if(!re) g_zsigs[idx].had_sell_first=true; else g_zsigs[idx].had_sell_reentry=true; }
  }

bool FirstSignalOpen(datetime zs, bool ib)
  {
   for(int i=0; i<g_signal_count; i++)
      if(g_signals[i].zone_start_time==zs && g_signals[i].is_buy==ib
         && g_signals[i].is_reentry==0)
         return (g_signals[i].result_tp1==0 && g_signals[i].result_tp2==0 &&
                 g_signals[i].result_tp3==0 && g_signals[i].result_tp4==0);
   return false;
  }

bool SignalExistsThisBar(datetime zs, bool ib, bool re, datetime bar_time)
  {
   for(int i=g_signal_count-1; i>=MathMax(0,g_signal_count-50); i--)
      if(g_signals[i].zone_start_time==zs && g_signals[i].is_buy==ib
         && (g_signals[i].is_reentry==1)==re
         && g_signals[i].signal_bar_time==bar_time)
         return true;
   return false;
  }

//==================================================================
// SL / TP CALCULATION
//==================================================================
double CalcBuySL(double s2v)
  { return NormalizeDouble(s2v - InpSLOffsetPoints*_Point, _Digits); }

double CalcSellSL(double r2v)
  {
   double sl = r2v + InpSLOffsetPoints*_Point;
   if(InpIncludeSpreadSL)
      sl += (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD)*_Point;
   return NormalizeDouble(sl, _Digits);
  }

void CalcTP(bool ib, double entry, double sl,
            double &tp1, double &tp2, double &tp3, double &tp4)
  {
   double risk = MathAbs(entry-sl);
   double dir  = ib ? 1.0 : -1.0;
   tp1 = NormalizeDouble(entry+dir*risk*InpTP1_RR, _Digits);
   tp2 = NormalizeDouble(entry+dir*risk*InpTP2_RR, _Digits);
   tp3 = NormalizeDouble(entry+dir*risk*InpTP3_RR, _Digits);
   tp4 = NormalizeDouble(entry+dir*risk*InpTP4_RR, _Digits);
  }

//==================================================================
// SIGNAL OBJECTS (TradingView Risk/Reward Style)
//==================================================================
void DrawSigLevel(string base, datetime t_sig, double price,
                  color clr, ENUM_LINE_STYLE sty, string lbl, int text_size)
  {
   string ln = base+"_L", tx = base+"_T";
   datetime t2   = t_sig + (datetime)(PeriodSeconds(_Period)*MathMax(1,InpSigExtendBars));
   datetime t_tx = t_sig + (datetime)(PeriodSeconds(_Period)*InpSigTextOffsetBars);

   if(ObjectFind(0,ln) < 0)
     {
      ObjectCreate(0,ln, OBJ_TREND, 0, t_sig, price, t2, price);
      ObjectSetInteger(0,ln,OBJPROP_STYLE,      sty);
      ObjectSetInteger(0,ln,OBJPROP_WIDTH,      1);
      ObjectSetInteger(0,ln,OBJPROP_RAY_RIGHT,  false);
      ObjectSetInteger(0,ln,OBJPROP_BACK,       false);
      ObjectSetInteger(0,ln,OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0,ln,OBJPROP_HIDDEN,     true);
      ObjectSetInteger(0,ln,OBJPROP_COLOR,      clr);
      ObjectSetInteger(0,ln,OBJPROP_ZORDER,     10);
     }
   if(InpShowSigText && ObjectFind(0,tx) < 0)
      ObjText(tx, t_tx, price, lbl, clr, text_size);
  }

double GetWinTP(int idx)
  {
   switch(InpDashWinTarget)
     {
      case DASH_WIN_TP1: return g_signals[idx].tp1;
      case DASH_WIN_TP2: return g_signals[idx].tp2;
      case DASH_WIN_TP3: return g_signals[idx].tp3;
      case DASH_WIN_TP4: return g_signals[idx].tp4;
      default:           return EMPTY_VALUE;
     }
  }

int GetTPResult(int idx, int tp_index)
  {
   if(tp_index==1) return g_signals[idx].result_tp1;
   if(tp_index==2) return g_signals[idx].result_tp2;
   if(tp_index==3) return g_signals[idx].result_tp3;
   return g_signals[idx].result_tp4;
  }

void SetTPResult(int idx, int tp_index, int value)
  {
   if(tp_index==1) g_signals[idx].result_tp1 = value;
   else if(tp_index==2) g_signals[idx].result_tp2 = value;
   else if(tp_index==3) g_signals[idx].result_tp3 = value;
   else g_signals[idx].result_tp4 = value;
  }

double GetTPPrice(int idx, int tp_index)
  {
   if(tp_index==1) return g_signals[idx].tp1;
   if(tp_index==2) return g_signals[idx].tp2;
   if(tp_index==3) return g_signals[idx].tp3;
   return g_signals[idx].tp4;
  }

void SyncPrimaryResult(int idx)
  {
   int tp_index = 1;
   if(InpDashWinTarget==DASH_WIN_TP2) tp_index = 2;
   else if(InpDashWinTarget==DASH_WIN_TP3) tp_index = 3;
   else if(InpDashWinTarget==DASH_WIN_TP4) tp_index = 4;
   g_signals[idx].result = GetTPResult(idx, tp_index);
  }

double SignalArrowOffset(int idx)
  {
   double risk = MathAbs(g_signals[idx].entry - g_signals[idx].sl);
   double by_risk = risk * 0.18;
   double by_points = 30.0 * _Point;
   return MathMax(by_points, by_risk);
  }

void CreateSignalObjects(int idx)
  {
   if(!InpShowSignalObjects) return;
   if(g_signals[idx].objects_created) return;

   string  base = SigBase(idx);
   bool    ib   = g_signals[idx].is_buy;
   color   ac   = ib ? clrLime : clrRed;
   double  ep   = g_signals[idx].entry;
   datetime st  = g_signals[idx].signal_bar_time;
   datetime t2  = st + (datetime)(PeriodSeconds(_Period)*MathMax(1,InpSigExtendBars));
   int text_size = (idx >= g_signal_count-1) ? InpLiveTextSize : InpHistTextSize;

   // Draw TradingView Style Risk/Reward Boxes if enabled
   if(InpShowRRBoxes && InpDashWinTarget!=DASH_WIN_NONE)
     {
      color rwd_color  = BlendColor(clrLime, 80);
      double target_tp = GetWinTP(idx);

      if(target_tp!=EMPTY_VALUE)
         ObjRect(base+"_RWDBOX", st, t2, MathMax(ep, target_tp), MathMin(ep, target_tp), rwd_color);
     }

   ObjArrow(base+"_ARW", st, ep, ib?233:234, ac, ib?ANCHOR_TOP:ANCHOR_BOTTOM, 3);

   if(InpShowEntry)
      DrawSigLevel(base+"_E",  st, ep,                 clrGold,   STYLE_SOLID, "Entry", text_size);
   if(InpShowSL)
      DrawSigLevel(base+"_SL", st, g_signals[idx].sl,  clrRed,    STYLE_SOLID, "SL", text_size);
   if(InpShowTP1)
      DrawSigLevel(base+"_T1", st, g_signals[idx].tp1, clrAqua,   STYLE_DOT,   "TP1", text_size);
   if(InpShowTP2)
      DrawSigLevel(base+"_T2", st, g_signals[idx].tp2, clrLime,   STYLE_DOT,   "TP2", text_size);
   if(InpShowTP3)
      DrawSigLevel(base+"_T3", st, g_signals[idx].tp3, clrLime,   STYLE_DOT,   "TP3", text_size);
   if(InpShowTP4)
      DrawSigLevel(base+"_T4", st, g_signals[idx].tp4, clrLime,   STYLE_DOT,   "TP4", text_size);

   g_signals[idx].objects_created = true;

   // Log หลังวาดเสร็จ — id เดียวกับที่ใช้ใน /api/signal + /api/status เพื่อ trace ข้าม MT5↔web
   if(InpDebugSignals)
      PrintFormat("Trend_Follow_M5M1: [Draw] idx=%d id=%s %s entry=%.5f sl=%.5f tp1=%.5f tp2=%.5f tp3=%.5f tp4=%.5f sig_time=%I64u",
                  idx, WebsiteSignalId(g_signals[idx].signal_bar_time),
                  g_signals[idx].is_buy ? "BUY" : "SELL",
                  g_signals[idx].entry, g_signals[idx].sl,
                  g_signals[idx].tp1, g_signals[idx].tp2, g_signals[idx].tp3, g_signals[idx].tp4,
                  (long)g_signals[idx].signal_bar_time);
  }

void DeleteAllSignalObjects()
  {
   DeleteByPrefix(g_spfx);
   for(int i=0; i<g_signal_count; i++)
      g_signals[i].objects_created = false;
  }

//==================================================================
// ADD SIGNAL RECORD
//==================================================================
void AddSignal(bool ib, bool re,
               datetime sig_time, datetime zs,
               double entry, double sl,
               double tp1, double tp2, double tp3, double tp4, bool is_live=false)
  {
   if(g_signal_count >= MAX_SIGNALS) { Print("Trend_Follow_M5M1: max signals reached"); return; }
   if(g_signal_count >= ArraySize(g_signals))
      ArrayResize(g_signals, g_signal_count+64);

   int n = g_signal_count;
   g_signals[n].is_buy          = ib;
   g_signals[n].is_reentry      = re ? 1 : 0;
   g_signals[n].signal_bar_time = sig_time;
   g_signals[n].zone_start_time = zs;
   g_signals[n].entry           = entry;
   g_signals[n].sl              = sl;
   g_signals[n].tp1=tp1; g_signals[n].tp2=tp2;
   g_signals[n].tp3=tp3; g_signals[n].tp4=tp4;
   g_signals[n].result          = 0;
   g_signals[n].result_tp1      = 0;
   g_signals[n].result_tp2      = 0;
   g_signals[n].result_tp3      = 0;
   g_signals[n].result_tp4      = 0;
   g_signals[n].objects_created = false;
   g_signals[n].is_live         = is_live;
   g_signals[n].reported        = false;
   g_signals[n].tg_msg_id       = 0;

   if(is_live)
      CreateSignalObjects(n);

   g_signal_count++;
  }

//==================================================================
// EVALUATE CANDLES
//==================================================================
void EvalSignalHistorical(int idx, double bar_hi, double bar_lo, datetime bar_time)
  {
   bool all_resolved = (g_signals[idx].result_tp1!=0 && g_signals[idx].result_tp2!=0 &&
                        g_signals[idx].result_tp3!=0 && g_signals[idx].result_tp4!=0);
   if(all_resolved) return;
   if(g_signals[idx].signal_bar_time > bar_time) return;

   if(g_signals[idx].signal_bar_time == bar_time)
     {
      if(InpHistSameBarPolicy == SAME_BAR_SKIP) return;
     }

   if(g_signals[idx].is_buy)
     {
      bool hit_sl = (bar_lo <= g_signals[idx].sl);
      if(hit_sl)
        {
         for(int tp=1; tp<=4; tp++)
            if(GetTPResult(idx,tp)==0) SetTPResult(idx,tp,-1);
         SyncPrimaryResult(idx);
         return;
        }
      for(int tp=1; tp<=4; tp++)
         if(GetTPResult(idx,tp)==0 && bar_hi >= GetTPPrice(idx,tp))
            SetTPResult(idx,tp,1);
     }
   else
     {
      bool hit_sl = (bar_hi >= g_signals[idx].sl);
      if(hit_sl)
        {
         for(int tp=1; tp<=4; tp++)
            if(GetTPResult(idx,tp)==0) SetTPResult(idx,tp,-1);
         SyncPrimaryResult(idx);
         return;
        }
      for(int tp=1; tp<=4; tp++)
         if(GetTPResult(idx,tp)==0 && bar_lo <= GetTPPrice(idx,tp))
            SetTPResult(idx,tp,1);
     }
   SyncPrimaryResult(idx);
  }

void EvalSignalLive(int idx, double bid, double ask)
  {
   bool all_resolved = (g_signals[idx].result_tp1!=0 && g_signals[idx].result_tp2!=0 &&
                        g_signals[idx].result_tp3!=0 && g_signals[idx].result_tp4!=0);
   if(all_resolved) return;

   // capture TP status snapshot เพื่อตรวจ delta สำหรับ Website Sync
   int pre1=GetTPResult(idx,1), pre2=GetTPResult(idx,2), pre3=GetTPResult(idx,3), pre4=GetTPResult(idx,4);
   int pre_res = g_signals[idx].result;

   if(g_signals[idx].is_buy)
     {
      if(bid <= g_signals[idx].sl)
        {
         for(int tp=1; tp<=4; tp++)
            if(GetTPResult(idx,tp)==0) SetTPResult(idx,tp,-1);
         SyncPrimaryResult(idx);
         MaybeReportSignal(idx);
         WebsiteSendStatusIfChanged(idx, pre1, pre2, pre3, pre4, pre_res);
         return;
        }
      for(int tp=1; tp<=4; tp++)
         if(GetTPResult(idx,tp)==0 && bid >= GetTPPrice(idx,tp))
            SetTPResult(idx,tp,1);
     }
   else
     {
      if(ask >= g_signals[idx].sl)
        {
         for(int tp=1; tp<=4; tp++)
            if(GetTPResult(idx,tp)==0) SetTPResult(idx,tp,-1);
         SyncPrimaryResult(idx);
         MaybeReportSignal(idx);
         WebsiteSendStatusIfChanged(idx, pre1, pre2, pre3, pre4, pre_res);
         return;
        }
      for(int tp=1; tp<=4; tp++)
         if(GetTPResult(idx,tp)==0 && ask <= GetTPPrice(idx,tp))
            SetTPResult(idx,tp,1);
     }
   SyncPrimaryResult(idx);
   MaybeReportSignal(idx);
   WebsiteSendStatusIfChanged(idx, pre1, pre2, pre3, pre4, pre_res);
  }

//--- ส่ง status ไป website เฉพาะเมื่อ TP/SL status ของสัญญาณเปลี่ยนจาก snapshot ก่อน eval
void WebsiteSendStatusIfChanged(int idx, int pre1, int pre2, int pre3, int pre4, int pre_res)
  {
   if(!WebsiteReady()) return;
   if(idx < 0 || idx >= g_signal_count) return;
   if(!g_signals[idx].is_live) return;
   bool changed = (GetTPResult(idx,1)!=pre1 || GetTPResult(idx,2)!=pre2 ||
                   GetTPResult(idx,3)!=pre3 || GetTPResult(idx,4)!=pre4 ||
                   g_signals[idx].result != pre_res);
   if(changed)
      WebsiteSendStatus(idx);
  }

void UpdateSignalResultsLive()
  {
   double bid = SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   for(int i=0; i<g_signal_count; i++)
      EvalSignalLive(i, bid, ask);
  }

//==================================================================
// CORE FIRE FUNCTION
//==================================================================
void FireSignal(bool ib, bool re, datetime sig_time, datetime zs,
                double entry, double box_edge_for_sl, double macd_val, bool is_live=false)
  {
   double sl = ib ? CalcBuySL(box_edge_for_sl) : CalcSellSL(box_edge_for_sl);

   if(ib && sl >= entry)
     {
      if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug] BUY REJECT - SL %.5f >= entry %.5f zone=%s", sl, entry, TimeToString(zs));
      return;
     }
   if(!ib && sl <= entry)
     {
      if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug] SELL REJECT - SL %.5f <= entry %.5f zone=%s", sl, entry, TimeToString(zs));
      return;
     }

   double tp1,tp2,tp3,tp4;
   CalcTP(ib, entry, sl, tp1,tp2,tp3,tp4);

   if(InpDebugSignals)
      PrintFormat("Trend_Follow_M5M1 %s %s: entry=%.5f sl=%.5f tp1=%.5f tp2=%.5f tp3=%.5f tp4=%.5f macd=%.6f zone=%s",
                  ib?"BUY":"SELL", re?"RE":"1ST",
                  entry, sl, tp1, tp2, tp3, tp4, macd_val, TimeToString(zs));

   BindZSigEntry(zs, ib, entry);
   int signal_idx = g_signal_count;
   AddSignal(ib, re, sig_time, zs, entry, sl, tp1, tp2, tp3, tp4, is_live);
   MarkFired(zs, ib, re);
   if(is_live && signal_idx < g_signal_count)
     {
      g_signals[signal_idx].tg_msg_id = SendTelegramSignal(ib, re, sig_time, entry, sl, tp1, tp2, tp3, tp4, macd_val);
      // Website Sync: ส่งสัญญาณใหม่ไป backend (แยกจาก Telegram, ปิดได้ด้วย InpUseWebsiteSync)
      if(is_live)
         WebsiteSendSignal(ib, re, sig_time, entry, sl, tp1, tp2, tp3, tp4, macd_val, signal_idx);
     }
  }

//==================================================================
// HISTORICAL SCAN
//==================================================================
void ScanHistoricalSignals()
  {
   Print("Trend_Follow_M5M1: Starting historical scan...");

   double r2a[],r1a[],ava[],s1a[],s2a[];
   datetime tma[];
   int copied = BuildDRSeries(InpZoneHistoryBars, r2a,r1a,ava,s1a,s2a,tma);
   if(copied <= 0) { Print("Trend_Follow_M5M1: DR series empty, scan aborted"); return; }

   double macd_arr[];
   int macd_ok = 0;
   if(InpUseMACDFilter)
     {
      ArraySetAsSeries(macd_arr, true);
      macd_ok = CopyBuffer(g_macd_handle, 0, 1, copied, macd_arr);
      if(macd_ok <= 0) { Print("Trend_Follow_M5M1: MACD buffer unavailable, scan aborted"); return; }
     }

   double hi_arr[], lo_arr[];
   ArraySetAsSeries(hi_arr, true);
   ArraySetAsSeries(lo_arr, true);
   int hc = CopyHigh(_Symbol,_Period,1,copied,hi_arr);
   int lc = CopyLow (_Symbol,_Period,1,copied,lo_arr);
   if(hc<=0 || lc<=0) { Print("Trend_Follow_M5M1: OHLC copy failed, scan aborted"); return; }

   int avail = (int)MathMin(MathMin(hc,lc), copied);
   if(InpUseMACDFilter) avail = MathMin(avail, macd_ok);

   datetime cur_zone_start = 0;
   double   cur_zone_avg   = EMPTY_VALUE;

   for(int i=avail-1; i>=0; i--)
     {
      if(ava[i]==EMPTY_VALUE || i>=hc || i>=lc) continue;

      if(ava[i] != cur_zone_avg)
        {
         cur_zone_avg   = ava[i];
         cur_zone_start = tma[i];
        }

      double macd_val = InpUseMACDFilter ? macd_arr[i] : 1.0;
      if(InpUseMACDFilter && (macd_val==EMPTY_VALUE || macd_val==0.0)) continue;

      double s2v        = s2a[i];
      double r2v        = r2a[i];
      double buy_entry  = NormalizeDouble(s1a[i]-(s1a[i]-s2a[i])*InpEntryPercent/100.0, _Digits);
      double sell_entry = NormalizeDouble(r1a[i]+(r2a[i]-r1a[i])*InpEntryPercent/100.0, _Digits);
      double center_mid = ava[i];

      if(InpAllowBuy && lo_arr[i]<=buy_entry)
        {
         if(InpUseMACDFilter && macd_val<=0.0)
           { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug] BUY blocked by MACD (%.6f) at %s", macd_val, TimeToString(tma[i])); }
         else if(CanFireBuyAt(cur_zone_start,false,buy_entry,CalcBuySL(s2v),tma[i]) && !SignalExistsThisBar(cur_zone_start,true,false,tma[i]))
            FireSignal(true, false, tma[i], cur_zone_start, buy_entry, s2v, macd_val, false);
        }

      if(InpAllowSell && hi_arr[i]>=sell_entry)
        {
         if(InpUseMACDFilter && macd_val>=0.0)
           { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug] SELL blocked by MACD (%.6f) at %s", macd_val, TimeToString(tma[i])); }
         else if(CanFireSellAt(cur_zone_start,false,sell_entry,CalcSellSL(r2v),tma[i]) && !SignalExistsThisBar(cur_zone_start,false,false,tma[i]))
            FireSignal(false, false, tma[i], cur_zone_start, sell_entry, r2v, macd_val, false);
        }

      for(int j=0; j<g_signal_count; j++)
         EvalSignalHistorical(j, hi_arr[i], lo_arr[i], tma[i]);

      if(InpAllowMidReentry && InpAllowBuy && hi_arr[i]>=center_mid && FirstSignalOpen(cur_zone_start,true))
         ArmReentry(cur_zone_start,true);
      if(InpAllowMidReentry && InpAllowSell && lo_arr[i]<=center_mid && FirstSignalOpen(cur_zone_start,false))
         ArmReentry(cur_zone_start,false);

      if(InpAllowMidReentry && InpAllowBuy && lo_arr[i]<=buy_entry)
        {
         if(InpUseMACDFilter && macd_val<=0.0)
           { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug] BUY RE-ENTRY blocked by MACD (%.6f) at %s", macd_val, TimeToString(tma[i])); }
         else if(CanFireBuyAt(cur_zone_start,true,buy_entry,CalcBuySL(s2v),tma[i]) && FirstSignalOpen(cur_zone_start,true) &&
                 !SignalExistsThisBar(cur_zone_start,true,true,tma[i]))
            FireSignal(true, true, tma[i], cur_zone_start, buy_entry, s2v, macd_val, false);
        }

      if(InpAllowMidReentry && InpAllowSell && hi_arr[i]>=sell_entry)
        {
         if(InpUseMACDFilter && macd_val>=0.0)
           { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug] SELL RE-ENTRY blocked by MACD (%.6f) at %s", macd_val, TimeToString(tma[i])); }
         else if(CanFireSellAt(cur_zone_start,true,sell_entry,CalcSellSL(r2v),tma[i]) && FirstSignalOpen(cur_zone_start,false) &&
                 !SignalExistsThisBar(cur_zone_start,false,true,tma[i]))
            FireSignal(false, true, tma[i], cur_zone_start, sell_entry, r2v, macd_val, false);
        }
     }

   if(InpShowSignalObjects)
     {
      int start_draw = InpShowHistSignals ? MathMax(0, g_signal_count - InpMaxHistSignals) : MathMax(0, g_signal_count - 1);
      for(int i=start_draw; i<g_signal_count; i++)
         CreateSignalObjects(i);
     }

   if(!InpUseHistoricalSignalsForZoneLock)
     {
      g_zsig_count = 0;
      if(InpDebugSignals) Print("Trend_Follow_M5M1: [Debug] Historical zone locks cleared");
     }

   PrintFormat("Trend_Follow_M5M1: Historical scan done. Signals=%d", g_signal_count);

   // Bulk sync ส่งสัญญาณทั้งหมดไปยัง website dashboard
   WebsiteSyncAllSignals();
  }

//==================================================================
// LIVE SIGNAL EVALUATION
//==================================================================
void EvaluateNewSignalLive(datetime cur_bar, bool is_new_bar)
  {
   double r2v,r1v,s1v,s2v,avg_v;
   datetime zs;
   if(!GetCurrentZone(r2v,r1v,s1v,s2v,avg_v,zs)) return;

   double buy_entry  = NormalizeDouble(s1v-(s1v-s2v)*InpEntryPercent/100.0, _Digits);
   double sell_entry = NormalizeDouble(r1v+(r2v-r1v)*InpEntryPercent/100.0, _Digits);
   double center_mid = avg_v;

   double bid = SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol,SYMBOL_ASK);
   double macd_now = GetMACDMain(0);

   if(is_new_bar && InpDebugEveryNewBar)
     {
      string lb = CanFireBuyAt(zs,false,buy_entry,CalcBuySL(s2v),cur_bar) ? "Open" : "Locked";
      string ls = CanFireSellAt(zs,false,sell_entry,CalcSellSL(r2v),cur_bar) ? "Open" : "Locked";
      PrintFormat("Trend_Follow_M5M1 [NewBar] %s ZS:%s | R1:%.5f S1:%.5f | BE:%.5f SE:%.5f | Bid:%.5f Ask:%.5f | MACD:%.6f | BuyLck:%s SellLck:%s",
                  TimeToString(cur_bar), TimeToString(zs), r1v, s1v, buy_entry, sell_entry, bid, ask, macd_now, lb, ls);
     }

   int spread = (int)SymbolInfoInteger(_Symbol,SYMBOL_SPREAD);
   if(InpMaxSpreadPoints>0 && spread>InpMaxSpreadPoints) return;

   if(InpSignalMode==SIGNAL_ON_TOUCH)
     {
      if(InpUseMACDFilter && (macd_now==EMPTY_VALUE || macd_now==0.0)) return;

      if(InpAllowMidReentry && InpAllowBuy && ask>=center_mid && FirstSignalOpen(zs,true))
         ArmReentry(zs,true);
      if(InpAllowMidReentry && InpAllowSell && bid<=center_mid && FirstSignalOpen(zs,false))
         ArmReentry(zs,false);

      if(InpAllowBuy && ask<=buy_entry)
        {
         if(InpUseMACDFilter && macd_now<=0.0)
           { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug Live] BUY blocked by MACD (%.6f) at %s", macd_now, TimeToString(cur_bar)); }
         else if(InpAllowMidReentry && CanFireBuyAt(zs,true,buy_entry,CalcBuySL(s2v),cur_bar) && FirstSignalOpen(zs,true) &&
                 !SignalExistsThisBar(zs,true,true,cur_bar))
            FireSignal(true, true, cur_bar, zs, buy_entry, s2v, macd_now, true);
         else if(CanFireBuyAt(zs,false,buy_entry,CalcBuySL(s2v),cur_bar) && !SignalExistsThisBar(zs,true,false,cur_bar))
           {
            double dist=MathAbs(ask-buy_entry);
            if(InpMaxDistPoints>0 && dist>InpMaxDistPoints*_Point)
              { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug Live] BUY skip - dist %.5f > max %.5f", dist, InpMaxDistPoints*_Point); }
            else
               FireSignal(true, false, cur_bar, zs, buy_entry, s2v, macd_now, true);
           }
        }

      if(InpAllowSell && bid>=sell_entry)
        {
         if(InpUseMACDFilter && macd_now>=0.0)
           { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug Live] SELL blocked by MACD (%.6f) at %s", macd_now, TimeToString(cur_bar)); }
         else if(InpAllowMidReentry && CanFireSellAt(zs,true,sell_entry,CalcSellSL(r2v),cur_bar) && FirstSignalOpen(zs,false) &&
                 !SignalExistsThisBar(zs,false,true,cur_bar))
            FireSignal(false, true, cur_bar, zs, sell_entry, r2v, macd_now, true);
         else if(CanFireSellAt(zs,false,sell_entry,CalcSellSL(r2v),cur_bar) && !SignalExistsThisBar(zs,false,false,cur_bar))
           {
            double dist=MathAbs(bid-sell_entry);
            if(InpMaxDistPoints>0 && dist>InpMaxDistPoints*_Point)
              { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug Live] SELL skip - dist %.5f > max %.5f", dist, InpMaxDistPoints*_Point); }
            else
               FireSignal(false, false, cur_bar, zs, sell_entry, r2v, macd_now, true);
           }
        }
     }
   else if(InpSignalMode==SIGNAL_ON_CANDLE_CLOSE)
     {
      double macd_cls = GetMACDMain(1);
      if(InpUseMACDFilter && (macd_cls==EMPTY_VALUE || macd_cls==0.0)) return;

      double low1  = iLow (_Symbol,_Period,1);
      double high1 = iHigh(_Symbol,_Period,1);
      datetime bar1_tm = iTime(_Symbol,_Period,1);

      if(InpAllowMidReentry && InpAllowBuy && high1>=center_mid && FirstSignalOpen(zs,true))
         ArmReentry(zs,true);
      if(InpAllowMidReentry && InpAllowSell && low1<=center_mid && FirstSignalOpen(zs,false))
         ArmReentry(zs,false);

      if(InpAllowBuy && low1<=buy_entry)
        {
         if(InpUseMACDFilter && macd_cls<=0.0)
           { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug Close] BUY blocked by MACD (%.6f) at %s", macd_cls, TimeToString(bar1_tm)); }
         else if(InpAllowMidReentry && CanFireBuyAt(zs,true,buy_entry,CalcBuySL(s2v),bar1_tm) && FirstSignalOpen(zs,true) &&
                 !SignalExistsThisBar(zs,true,true,bar1_tm))
            FireSignal(true, true, bar1_tm, zs, buy_entry, s2v, macd_cls, true);
         else if(CanFireBuyAt(zs,false,buy_entry,CalcBuySL(s2v),bar1_tm) && !SignalExistsThisBar(zs,true,false,bar1_tm))
            FireSignal(true, false, bar1_tm, zs, buy_entry, s2v, macd_cls, true);
        }

      if(InpAllowSell && high1>=sell_entry)
        {
         if(InpUseMACDFilter && macd_cls>=0.0)
           { if(InpDebugSignals) PrintFormat("Trend_Follow_M5M1: [Debug Close] SELL blocked by MACD (%.6f) at %s", macd_cls, TimeToString(bar1_tm)); }
         else if(InpAllowMidReentry && CanFireSellAt(zs,true,sell_entry,CalcSellSL(r2v),bar1_tm) && FirstSignalOpen(zs,false) &&
                 !SignalExistsThisBar(zs,false,true,bar1_tm))
            FireSignal(false, true, bar1_tm, zs, sell_entry, r2v, macd_cls, true);
         else if(CanFireSellAt(zs,false,sell_entry,CalcSellSL(r2v),bar1_tm) && !SignalExistsThisBar(zs,false,false,bar1_tm))
            FireSignal(false, false, bar1_tm, zs, sell_entry, r2v, macd_cls, true);
        }
     }
  }

//==================================================================
// DASHBOARD (Modern UI Panel)
//==================================================================
void CreateOrUpdateLbl(string n, int y_off, string txt, color clr, int pad)
  {
   if(ObjectFind(0,n) < 0)
     {
      ObjectCreate(0,n,OBJ_LABEL,0,0,0);
      ObjectSetString (0,n,OBJPROP_FONT, "Courier New");
      ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,n,OBJPROP_HIDDEN,true);
     }
   ObjectSetInteger(0,n,OBJPROP_CORNER,    InpDashCorner);
   ObjectSetInteger(0,n,OBJPROP_XDISTANCE, InpDashX + pad);
   ObjectSetInteger(0,n,OBJPROP_YDISTANCE, InpDashY + pad + y_off);
   ObjectSetInteger(0,n,OBJPROP_FONTSIZE,  InpDashFontSize);
   ObjectSetString (0,n,OBJPROP_TEXT,      txt);
   ObjectSetInteger(0,n,OBJPROP_COLOR,     clr);
  }

void UpdateDashboard()
  {
   if(!InpShowDashboard)
     {
      DeleteByPrefix(g_dash_name);
      return;
     }

   string d_bg = g_dash_name + "_BG";

   int pad = MathMax(0, InpDashPadding);
   int lh  = InpDashFontSize + MathMax(0, InpDashLineGap);
   int w   = MathMax(120, InpDashWidth);
   int h   = pad*2 + lh*5;

   //--- Panel Background ---
   if(ObjectFind(0,d_bg) < 0)
     {
      ObjectCreate(0,d_bg,OBJ_RECTANGLE_LABEL,0,0,0);
      ObjectSetInteger(0,d_bg,OBJPROP_BGCOLOR, clrBlack);
      ObjectSetInteger(0,d_bg,OBJPROP_BORDER_TYPE, BORDER_FLAT);
      ObjectSetInteger(0,d_bg,OBJPROP_COLOR, clrDimGray);
      ObjectSetInteger(0,d_bg,OBJPROP_SELECTABLE,false);
      ObjectSetInteger(0,d_bg,OBJPROP_HIDDEN,true);
     }
   ObjectSetInteger(0,d_bg,OBJPROP_CORNER,    InpDashCorner);
   ObjectSetInteger(0,d_bg,OBJPROP_XDISTANCE, InpDashX);
   ObjectSetInteger(0,d_bg,OBJPROP_YDISTANCE, InpDashY);
   ObjectSetInteger(0,d_bg,OBJPROP_XSIZE,     w);
   ObjectSetInteger(0,d_bg,OBJPROP_YSIZE,     h);

   CreateOrUpdateLbl(g_dash_name+"_HDR", 0,
                     StringFormat("%-4s %5s %5s %8s", "TP", "Win", "Loss", "Winrate"),
                     clrAqua, pad);

   for(int tp=1; tp<=4; tp++)
     {
      int win=0, loss=0, resolved_count=0;
      for(int i=g_signal_count-1; i>=0; i--)
        {
         int r = GetTPResult(i,tp);
         if(r==0) continue;
         if(r==1) win++; else loss++;
         resolved_count++;
         if(resolved_count >= InpDashSignalCount) break;
        }

      double wr = (win+loss>0) ? (double)win/(win+loss)*100.0 : 0.0;
      string row = StringFormat("TP%-2d %5d %5d %7.1f%%", tp, win, loss, wr);
      CreateOrUpdateLbl(g_dash_name+"_TP"+IntegerToString(tp), lh*tp, row,
                        wr>=50.0 ? clrWhite : clrSilver, pad);
     }
  }

//==================================================================
// OnInit
//==================================================================
int OnInit()
  {
   string mg = IntegerToString((long)InpMagicNumber);
   string tf = IntegerToString((int)_Period);

   DeleteAllJPSObjects();

   g_zpfx      = "WST_"+mg+"_"+_Symbol+"_"+tf+"_Z";
   g_spfx      = "WST_"+mg+"_"+_Symbol+"_"+tf+"_S";
   g_dash_name = "WST_"+mg+"_"+_Symbol+"_"+tf+"_DASH";
   g_test_button_name = "WST_"+mg+"_"+_Symbol+"_"+tf+"_TEST_TELEGRAM";

   g_atr_handle  = INVALID_HANDLE;
   g_macd_handle = INVALID_HANDLE;
   EnsureIndicatorHandles();

   ArrayResize(g_signals, 256);
   ArrayResize(g_zsigs,   64);

   g_signal_count   = 0;
   g_zsig_count     = 0;
   g_last_bar_time  = 0;
   g_last_zone_bar  = 0;
   g_history_scanned= false;

   EventSetTimer(1);
   CreateOrUpdateTestButton();
   PrintFormat("Trend_Follow_M5M1: OnInit OK | symbol=%s timeframe=%s", _Symbol, EnumToString(_Period));
   return INIT_SUCCEEDED;
  }

//==================================================================
// OnDeinit
//==================================================================
void OnDeinit(const int reason)
  {
   PrintFormat("Trend_Follow_M5M1: OnDeinit reason=%s (%d)", DeinitReasonText(reason), reason);

   EventKillTimer();

   if(g_atr_handle != INVALID_HANDLE) { IndicatorRelease(g_atr_handle); g_atr_handle = INVALID_HANDLE; }
   if(g_macd_handle != INVALID_HANDLE) { IndicatorRelease(g_macd_handle); g_macd_handle = INVALID_HANDLE; }

   if(reason==REASON_REMOVE && InpDeleteAllChartObjectsOnRemove)
     {
      DeleteAllChartObjectsHard();
      ChartRedraw(0);
      return;
     }

   if(ShouldDeleteObjectsOnDeinit(reason))
     {
      DeleteAnyDashboardObjects();
      DeleteAllJPSObjects();
      DeleteLegacyDynamicRangeObjects();
     }

   ChartRedraw(0);
  }

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
  {
   if(id == CHARTEVENT_OBJECT_CLICK && sparam == g_test_button_name)
     {
      ObjectSetInteger(0,g_test_button_name,OBJPROP_STATE,false);
      SendTelegramTest();
      ChartRedraw(0);
     }
  }

//==================================================================
// OnTick
//==================================================================
void OnTick()
  {
   CreateOrUpdateTestButton();
   if(InpShowTestButton && ObjectFind(0,g_test_button_name) >= 0)
     {
      bool pressed = (bool)ObjectGetInteger(0,g_test_button_name,OBJPROP_STATE);
      if(pressed)
        {
         ObjectSetInteger(0,g_test_button_name,OBJPROP_STATE,false);
         Print("Trend_Follow_M5M1: Test Signal button state detected in OnTick.");
         SendTelegramTest();
         ChartRedraw(0);
        }
     }

   if(HandleAlgoOffCleanup()) return;

   if(!EnsureIndicatorHandles()) return;
   if(BarsCalculated(g_atr_handle) < InpDRLength+2) return;
   if(InpUseMACDFilter && BarsCalculated(g_macd_handle) < InpMACDSlow+InpMACDSignal+2) return;

   datetime cur_bar = iTime(_Symbol,_Period,0);
   bool is_new_bar  = (cur_bar != g_last_bar_time);
   if(is_new_bar) g_last_bar_time = cur_bar;

   if(!g_history_scanned)
     {
      ScanHistoricalSignals();
      g_history_scanned = true;
      RebuildZoneObjects();
      g_last_zone_bar = cur_bar;
      // sync zones ครั้งแรกหลัง historical scan
      WebsiteSendZones();
     }

   if(is_new_bar && cur_bar != g_last_zone_bar)
     {
      RebuildZoneObjects();
      g_last_zone_bar = cur_bar;
      // sync zones ทุก new bar (zones rebuild ทุก bar)
      WebsiteSendZones();
     }

   if(InpSignalMode==SIGNAL_ON_CANDLE_CLOSE && !is_new_bar)
     {
      UpdateSignalResultsLive();
      if(InpShowDashboard) UpdateDashboard();
      return;
     }

   EvaluateNewSignalLive(cur_bar, is_new_bar);
   UpdateSignalResultsLive();

   // Website Sync: ส่ง market snapshot (ราคา + OHLC M1/M5) ตาม interval
   if(WebsiteReady())
     {
      ulong now_ms = GetTickCount64();
      if(g_last_website_market_ms == 0 ||
         now_ms - g_last_website_market_ms >= (ulong)MathMax(500, InpWebsitePriceMs))
        {
         WebsiteSendMarket();
         // sync zones ด้วยทุก market cycle (keep zones fresh แม้ไม่มี new bar)
         WebsiteSendZones();
         g_last_website_market_ms = now_ms;
        }
      // Periodic bulk resync ทุก 5 นาที (300000 ms) — อัปเดต objects/status ของทุก signal
      // ป้องกันกรณี signal เก่าไม่มี objects (bulk ครั้งแรก) หรือ single POST ที่ไม่ได้แนบ objects
      if(g_last_website_bulk_ms == 0 ||
         now_ms - g_last_website_bulk_ms >= 300000)
        {
         WebsiteSyncAllSignals();
         g_last_website_bulk_ms = now_ms;
        }
     }

   if(InpShowDashboard) UpdateDashboard();

   ChartRedraw(0);
  }

void OnTimer()
  {
   OnTick();
  }
//+------------------------------------------------------------------+
