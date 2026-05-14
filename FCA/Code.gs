// =============================================================
//  FCA CVR — Google Apps Script Backend
//  Sprint 1: Sheet Setup + Auth Skeleton
// =============================================================
//  SETUP INSTRUCTIONS:
//  1. Create a new Google Sheet
//  2. Copy its ID from the URL (the long string between /d/ and /edit)
//  3. Paste it below, then run setupSheets() once from the editor
// =============================================================

var SPREADSHEET_ID  = "1DIQCtyGrrRnrJJcmxL20HbDd5mm2FQtqCsLqKYUQEUU";
var PHOTOS_FOLDER_ID = "1iyM_yhywNyL3fuDztZq9cFjUgHsGS8SW";

// =============================================================
//  SHEET SETUP
// =============================================================

function setupSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  var schema = {
    users:         ["user_id", "username", "password_hash", "role", "campus_assignment", "full_name"],
    campuses:      ["campus_id", "campus_name"],
    categories:    ["category_id", "campus_id", "sport_type", "age_group"],
    players:       ["player_id", "full_name", "campus_id", "category_id", "date_registered"],
    events:        ["event_id", "campus_id", "category_id", "date", "time", "volunteer_ids", "topic_id", "event_type", "recurrence", "notes"],
    attendance:    ["record_id", "event_id", "player_id", "praises", "prayer_requests", "date"],
    topics:        ["topic_id", "title", "passage", "discussion_questions", "created_by", "date_created"],
    announcements: ["post_id", "title", "body", "media_drive_url", "week_label", "created_by", "date_posted"],
    photos:        ["photo_id", "drive_file_id", "campus_id", "date_taken", "caption", "uploaded_by", "date_uploaded"],
    sessions:      ["token", "user_id", "expires_at"]
  };

  // Create or clear each sheet tab
  for (var tabName in schema) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    } else {
      sheet.clearContents();
    }

    var headers = schema[tabName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Style the header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0D4F4F");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  // Remove the default "Sheet1" if it exists and is empty
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  seedData_(ss);

  Logger.log("✅ FCA CVR sheets created and seeded successfully.");
}

// =============================================================
//  SEED DATA
// =============================================================

function seedData_(ss) {
  // Campuses
  var campusSheet = ss.getSheetByName("campuses");
  campusSheet.getRange(2, 1, 2, 2).setValues([
    ["campus_001", "Campus A"],
    ["campus_002", "Campus B"]
  ]);

  // Categories (sport_type + age_group combos per campus)
  var catSheet = ss.getSheetByName("categories");
  catSheet.getRange(2, 1, 6, 4).setValues([
    ["cat_001", "campus_001", "Basketball", "16U"],
    ["cat_002", "campus_001", "Basketball", "College"],
    ["cat_003", "campus_001", "Football",   "16U"],
    ["cat_004", "campus_002", "Basketball", "16U"],
    ["cat_005", "campus_002", "Soccer",     "16U"],
    ["cat_006", "campus_002", "Football",   "College"]
  ]);

  // Users — 1 admin + 2 volunteers
  var userSheet = ss.getSheetByName("users");
  userSheet.getRange(2, 1, 3, 6).setValues([
    ["user_001", "admin",   hashPassword_("admin123"),  "admin",     "",           "Admin User"],
    ["user_002", "vol_a",   hashPassword_("volunteer1"), "volunteer", "campus_001", "Volunteer Alpha"],
    ["user_003", "vol_b",   hashPassword_("volunteer2"), "volunteer", "campus_002", "Volunteer Beta"]
  ]);

  Logger.log("✅ Seed data inserted.");
}

// =============================================================
//  UTILITIES
// =============================================================

function hashPassword_(password) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return raw.map(function(b) {
    return ("0" + (b & 0xFF).toString(16)).slice(-2);
  }).join("");
}

function generateId_(prefix) {
  return prefix + "_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
}

function generatePlayerId_() {
  var d    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  var rand = String(Math.floor(Math.random() * 900) + 100);
  return "PLY-" + d + "-" + rand;
}

function getSheet_(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function sheetToObjects_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var tz = Session.getScriptTimeZone();
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var val = row[i];
      obj[h] = (val instanceof Date)
        ? Utilities.formatDate(val, tz, "yyyy-MM-dd")
        : val;
    });
    return obj;
  });
}

function findRowIndex_(sheet, colName, value) {
  var data = sheet.getDataRange().getValues();
  var col  = data[0].indexOf(colName);
  for (var i = 1; i < data.length; i++) {
    if (data[i][col] === value) return i + 1; // 1-based sheet row
  }
  return -1;
}

function getUserById_(userId) {
  var users = sheetToObjects_(getSheet_("users"));
  return users.find(function(u) { return u.user_id === userId; }) || null;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================================
//  ROUTER
// =============================================================

function doGet(e) {
  var action = e.parameter.action;
  try {
    switch (action) {
      case "getEvents":        return handleGetEvents_(e);
      case "getPlayers":       return handleGetPlayers_(e);
      case "getAttendance":    return handleGetAttendance_(e);
      case "getTopics":        return handleGetTopics_(e);
      case "getAnnouncements":    return handleGetAnnouncements_(e);
      case "getPhotos":           return handleGetPhotos_(e);
      case "getWeeklyHighlight":  return handleGetWeeklyHighlight_(e);
      case "getCategories":       return handleGetCategories_(e);
      case "getCampuses":      return handleGetCampuses_(e);
      case "getStaffing":      return handleGetStaffing_(e);
      case "getMetrics":       return handleGetMetrics_(e);
      default:
        return jsonResponse_({ error: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var action  = payload.action;
  try {
    switch (action) {
      // Auth
      case "login":               return handleLogin_(payload);
      case "logout":              return handleLogout_(payload);
      case "changePassword":      return handleChangePassword_(payload);
      case "updateProfile":       return handleUpdateProfile_(payload);
      case "registerUser":        return handleRegisterUser_(payload);
      case "updateUser":          return handleUpdateUser_(payload);
      // Events
      case "createEvent":         return handleCreateEvent_(payload);
      case "updateEvent":         return handleUpdateEvent_(payload);
      case "deleteEvent":         return handleDeleteEvent_(payload);
      // Players
      case "registerPlayer":      return handleRegisterPlayer_(payload);
      case "updatePlayer":        return handleUpdatePlayer_(payload);
      case "deletePlayer":        return handleDeletePlayer_(payload);
      // Attendance
      case "submitAttendance":    return handleSubmitAttendance_(payload);
      case "editAttendance":      return handleEditAttendance_(payload);
      // Topics
      case "createTopic":         return handleCreateTopic_(payload);
      case "updateTopic":         return handleUpdateTopic_(payload);
      case "deleteTopic":         return handleDeleteTopic_(payload);
      // Announcements
      case "createAnnouncement":  return handleCreateAnnouncement_(payload);
      case "deleteAnnouncement":  return handleDeleteAnnouncement_(payload);
      case "uploadPhoto":         return handleUploadPhoto_(payload);
      case "deletePhoto":         return handleDeletePhoto_(payload);
      // Categories
      case "createCategory":      return handleCreateCategory_(payload);
      case "updateCategory":      return handleUpdateCategory_(payload);
      case "deleteCategory":      return handleDeleteCategory_(payload);
      default:
        return jsonResponse_({ error: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

// =============================================================
//  AUTH HANDLERS
// =============================================================

function handleLogin_(payload) {
  var sheet = getSheet_("users");
  var users = sheetToObjects_(sheet);
  var hashed = hashPassword_(payload.password);

  var match = users.find(function(u) {
    return u.username === payload.username && u.password_hash === hashed;
  });

  if (!match) return jsonResponse_({ error: "Invalid credentials." });

  // Create session token — store expiry as Unix ms (number) so Sheets won't
  // auto-convert it to a Date cell and strip the time component on read-back.
  var token   = generateId_("tok");
  var expires = Date.now() + 8 * 60 * 60 * 1000; // Unix ms, 8 hours from now

  var sessionSheet = getSheet_("sessions");
  sessionSheet.appendRow([token, match.user_id, expires]);

  return jsonResponse_({
    token:   token,
    role:    match.role,
    user_id: match.user_id,
    full_name: match.full_name,
    campus_assignment: match.campus_assignment
  });
}

function handleLogout_(payload) {
  var sheet = getSheet_("sessions");
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === payload.token) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return jsonResponse_({ success: true });
}

function validateToken_(token) {
  if (!token) return null;
  var sessions = sheetToObjects_(getSheet_("sessions"));
  var session  = sessions.find(function(s) { return s.token === token; });
  if (!session) return null;
  if (Number(session.expires_at) < Date.now()) return null;
  return session.user_id;
}

function handleChangePassword_(payload) {
  // Requires: token, current_password, new_password
  var userId = validateToken_(payload.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });

  if (!payload.new_password || payload.new_password.length < 6) {
    return jsonResponse_({ error: "New password must be at least 6 characters." });
  }

  var sheet = getSheet_("users");
  var data  = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol   = headers.indexOf("user_id") + 1;
  var hashCol = headers.indexOf("password_hash") + 1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol - 1] === userId) {
      var currentHash = data[i][hashCol - 1];
      if (currentHash !== hashPassword_(payload.current_password)) {
        return jsonResponse_({ error: "Current password is incorrect." });
      }
      sheet.getRange(i + 1, hashCol).setValue(hashPassword_(payload.new_password));
      return jsonResponse_({ success: true });
    }
  }

  return jsonResponse_({ error: "User not found." });
}

function handleUpdateProfile_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });

  var sheet   = getSheet_("users");
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var userRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf("user_id")] === userId) { userRow = i + 1; break; }
  }
  if (userRow < 0) return jsonResponse_({ error: "User not found." });

  var result = {};

  if (p.new_username) {
    var users = sheetToObjects_(sheet);
    if (users.find(function(u) { return u.username === p.new_username && u.user_id !== userId; })) {
      return jsonResponse_({ error: "Username already taken." });
    }
    var unCol = headers.indexOf("username") + 1;
    sheet.getRange(userRow, unCol).setValue(p.new_username);
    result.new_username = p.new_username;
  }

  if (p.new_password) {
    if (p.new_password.length < 6) return jsonResponse_({ error: "Password must be at least 6 characters." });
    var currentHash = data[userRow - 1][headers.indexOf("password_hash")];
    if (currentHash !== hashPassword_(p.current_password || "")) {
      return jsonResponse_({ error: "Current password is incorrect." });
    }
    var hashCol = headers.indexOf("password_hash") + 1;
    sheet.getRange(userRow, hashCol).setValue(hashPassword_(p.new_password));
    result.password_changed = true;
  }

  result.success = true;
  return jsonResponse_(result);
}

function handleRegisterUser_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var admin = getUserById_(userId);
  if (!admin || admin.role !== "admin") return jsonResponse_({ error: "Admin only." });
  if (!p.username || !p.password || !p.full_name) return jsonResponse_({ error: "username, password, and full_name are required." });
  if (p.password.length < 6) return jsonResponse_({ error: "Password must be at least 6 characters." });

  var users = sheetToObjects_(getSheet_("users"));
  if (users.find(function(u) { return u.username === p.username; })) {
    return jsonResponse_({ error: "Username already taken." });
  }

  var newId = generateId_("user");
  getSheet_("users").appendRow([
    newId, p.username, hashPassword_(p.password),
    p.role || "volunteer", p.campus_assignment || "", p.full_name
  ]);
  return jsonResponse_({ success: true, user_id: newId });
}

function handleUpdateUser_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var admin = getUserById_(userId);
  if (!admin || admin.role !== "admin") return jsonResponse_({ error: "Admin only." });

  var sheet   = getSheet_("users");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowIdx  = findRowIndex_(sheet, "user_id", p.user_id);
  if (rowIdx < 0) return jsonResponse_({ error: "User not found." });

  ["full_name","campus_assignment","role"].forEach(function(f) {
    if (p[f] === undefined) return;
    var col = headers.indexOf(f) + 1;
    if (col) sheet.getRange(rowIdx, col).setValue(p[f]);
  });
  return jsonResponse_({ success: true });
}

// =============================================================
//  STUB HANDLERS (filled in Sprints 2–5)
// =============================================================

function handleGetEvents_(e) {
  var month    = parseInt(e.parameter.month);   // 1–12
  var year     = parseInt(e.parameter.year);
  var campusId = e.parameter.campus_id || "";

  var events = sheetToObjects_(getSheet_("events")).filter(function(ev) {
    if (!ev.date) return false;
    var d = new Date(ev.date);
    var matchMonth  = (d.getUTCMonth() + 1 === month && d.getUTCFullYear() === year);
    var matchCampus = !campusId || ev.campus_id === campusId;
    return matchMonth && matchCampus;
  });

  // Resolve volunteer names + parse JSON array
  var users = sheetToObjects_(getSheet_("users"));
  events = events.map(function(ev) {
    var ids = [];
    try { ids = JSON.parse(ev.volunteer_ids || "[]"); } catch(e) {}
    ev.volunteer_ids = ids;
    ev.volunteer_names = ids.map(function(id) {
      var u = users.find(function(u) { return u.user_id === id; });
      return u ? u.full_name : id;
    });
    // Parse recurrence field  "weekly:grp_xxx:12" → object
    var rec = ev.recurrence || "none";
    if (rec !== "none") {
      var parts = rec.split(":");
      ev.recurrence = { type: parts[0], group_id: parts[1], total: parseInt(parts[2]) };
    } else {
      ev.recurrence = { type: "none" };
    }
    return ev;
  });

  return jsonResponse_(events);
}

// ── Campuses ──────────────────────────────────────────────────
function handleGetCampuses_(e) {
  return jsonResponse_(sheetToObjects_(getSheet_("campuses")));
}

// ── Categories ────────────────────────────────────────────────
function handleGetCategories_(e) {
  var campusId = e.parameter.campus_id || "";
  var cats = sheetToObjects_(getSheet_("categories"));
  if (campusId) cats = cats.filter(function(c) { return c.campus_id === campusId; });
  return jsonResponse_(cats);
}

// ── Players ───────────────────────────────────────────────────
function handleGetPlayers_(e) {
  var campusId   = e.parameter.campus_id   || "";
  var categoryId = e.parameter.category_id || "";
  var players = sheetToObjects_(getSheet_("players")).filter(function(p) {
    var mc = !campusId   || p.campus_id   === campusId;
    var mk = !categoryId || p.category_id === categoryId;
    return mc && mk;
  });
  // Join campus name + category label
  var campuses   = sheetToObjects_(getSheet_("campuses"));
  var categories = sheetToObjects_(getSheet_("categories"));
  players = players.map(function(p) {
    var campus = campuses.find(function(c) { return c.campus_id === p.campus_id; });
    var cat    = categories.find(function(c) { return c.category_id === p.category_id; });
    p.campus_name   = campus ? campus.campus_name : p.campus_id;
    p.category_label = cat ? (cat.sport_type + " · " + cat.age_group) : p.category_id;
    return p;
  });
  return jsonResponse_(players);
}

function handleRegisterPlayer_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  if (!p.full_name) return jsonResponse_({ error: "full_name is required." });

  var playerId = generatePlayerId_();
  var date     = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  getSheet_("players").appendRow([playerId, p.full_name, p.campus_id || "", p.category_id || "", date]);
  return jsonResponse_({ success: true, player_id: playerId });
}

function handleUpdatePlayer_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });

  var sheet   = getSheet_("players");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowIdx  = findRowIndex_(sheet, "player_id", p.player_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Player not found." });

  ["full_name","campus_id","category_id"].forEach(function(f) {
    if (p[f] === undefined) return;
    var col = headers.indexOf(f) + 1;
    if (col) sheet.getRange(rowIdx, col).setValue(p[f]);
  });
  return jsonResponse_({ success: true });
}

function handleDeletePlayer_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var user = getUserById_(userId);
  if (!user || user.role !== "admin") return jsonResponse_({ error: "Admin only." });

  var sheet = getSheet_("players");
  var rowIdx = findRowIndex_(sheet, "player_id", p.player_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Player not found." });
  sheet.deleteRow(rowIdx);
  return jsonResponse_({ success: true });
}

// ── Attendance ────────────────────────────────────────────────
function handleGetAttendance_(e) {
  var eventId = e.parameter.event_id;
  if (!eventId) return jsonResponse_({ error: "event_id required." });
  var records = sheetToObjects_(getSheet_("attendance")).filter(function(r) {
    return r.event_id === eventId;
  });
  return jsonResponse_(records);
}

function handleSubmitAttendance_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  if (!p.event_id || !Array.isArray(p.records)) return jsonResponse_({ error: "event_id and records[] required." });

  var sheet    = getSheet_("attendance");
  var date     = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var existing = sheetToObjects_(sheet).filter(function(r) { return r.event_id === p.event_id; });

  // Map existing records by player_id for fast lookup
  var existingMap = {};
  existing.forEach(function(r) { existingMap[r.player_id] = r; });

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var count   = 0;

  p.records.forEach(function(r) {
    if (existingMap[r.player_id]) {
      // Update existing record
      var rowIdx = findRowIndex_(sheet, "record_id", existingMap[r.player_id].record_id);
      if (rowIdx > 0) {
        ["praises","prayer_requests"].forEach(function(f) {
          var col = headers.indexOf(f) + 1;
          if (col) sheet.getRange(rowIdx, col).setValue(r[f] || "");
        });
      }
    } else {
      // Insert new record
      sheet.appendRow([
        generateId_("att"),
        p.event_id,
        r.player_id,
        r.praises          || "",
        r.prayer_requests  || "",
        date
      ]);
    }
    count++;
  });

  return jsonResponse_({ success: true, processed: count });
}

function handleEditAttendance_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });

  var sheet   = getSheet_("attendance");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowIdx  = findRowIndex_(sheet, "record_id", p.record_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Record not found." });

  ["praises","prayer_requests"].forEach(function(f) {
    if (p[f] === undefined) return;
    var col = headers.indexOf(f) + 1;
    if (col) sheet.getRange(rowIdx, col).setValue(p[f]);
  });
  return jsonResponse_({ success: true });
}

// ── Staffing / Metrics (Sprint 4) ─────────────────────────────
function handleGetTopics_(e)           { return jsonResponse_(sheetToObjects_(getSheet_("topics"))); }
function handleGetAnnouncements_(e)    { return jsonResponse_(sheetToObjects_(getSheet_("announcements"))); }
function handleGetStaffing_(e) {
  var volunteers  = sheetToObjects_(getSheet_("users")).filter(function(u) { return u.role === "volunteer"; });
  var campuses    = sheetToObjects_(getSheet_("campuses"));
  var players     = sheetToObjects_(getSheet_("players"));
  var categories  = sheetToObjects_(getSheet_("categories"));

  var campusGroups = {};
  campuses.forEach(function(c) {
    campusGroups[c.campus_id] = {
      campus_id:    c.campus_id,
      campus_name:  c.campus_name,
      volunteers:   [],
      player_count: players.filter(function(p) { return p.campus_id === c.campus_id; }).length,
      categories:   categories.filter(function(cat) { return cat.campus_id === c.campus_id; })
    };
  });

  volunteers.forEach(function(u) {
    var raw = u.campus_assignment || "[]";
    var ids = [];
    try { ids = JSON.parse(raw); } catch(e) {}
    // Fallback: old single-string value
    if (!Array.isArray(ids)) ids = raw ? [raw] : [];
    if (ids.length === 0 && raw && raw[0] !== "[") ids = [raw];
    ids.forEach(function(cid) {
      var group = campusGroups[cid];
      if (group) group.volunteers.push({ user_id: u.user_id, full_name: u.full_name, username: u.username, campus_assignments: ids });
    });
  });

  return jsonResponse_(Object.values(campusGroups));
}

function handleGetMetrics_(e) {
  var campusId   = e.parameter.campus_id || "";
  var players    = sheetToObjects_(getSheet_("players"));
  var attendance = sheetToObjects_(getSheet_("attendance"));
  var events     = sheetToObjects_(getSheet_("events"));
  var categories = sheetToObjects_(getSheet_("categories"));

  var filteredPlayers = campusId ? players.filter(function(p) { return p.campus_id === campusId; }) : players;
  var playerIds       = filteredPlayers.map(function(p) { return p.player_id; });
  var filteredAtt     = attendance.filter(function(r) { return !campusId || playerIds.indexOf(r.player_id) > -1; });
  var filteredEvents  = campusId ? events.filter(function(ev) { return ev.campus_id === campusId; }) : events;

  // Attendance count by month (last 6)
  var monthMap = {};
  filteredAtt.forEach(function(r) {
    if (!r.date) return;
    var key = String(r.date).substring(0, 7);
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  var attendanceByMonth = Object.keys(monthMap).sort().slice(-6).map(function(k) {
    return { month: k, count: monthMap[k] };
  });

  // Player count per category
  var catMap = {};
  filteredPlayers.forEach(function(p) {
    var cat   = categories.find(function(c) { return c.category_id === p.category_id; });
    var label = cat ? (cat.sport_type + " · " + cat.age_group) : (p.category_id || "Uncategorized");
    catMap[label] = (catMap[label] || 0) + 1;
  });
  var categoryBreakdown = Object.keys(catMap).map(function(k) { return { category: k, count: catMap[k] }; });

  // Event count by type
  var regularCount = filteredEvents.filter(function(ev) { return ev.event_type !== "special"; }).length;
  var specialCount = filteredEvents.filter(function(ev) { return ev.event_type === "special"; }).length;

  return jsonResponse_({
    total_players:      filteredPlayers.length,
    total_attendance:   filteredAtt.length,
    total_events:       filteredEvents.length,
    regular_events:     regularCount,
    special_events:     specialCount,
    attendance_by_month: attendanceByMonth,
    category_breakdown:  categoryBreakdown
  });
}

function handleCreateEvent_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });

  var sheet   = getSheet_("events");
  var groupId = generateId_("grp");
  var weeks   = parseInt(p.weeks) || 1;
  var recType = p.recurrence || "none";
  var volIds  = JSON.stringify(Array.isArray(p.volunteer_ids) ? p.volunteer_ids : []);
  var created = 0;
  var firstId = "";

  var baseDate = new Date(p.date);

  for (var i = 0; i < (recType === "weekly" ? weeks : 1); i++) {
    var d = new Date(baseDate);
    d.setUTCDate(d.getUTCDate() + i * 7);
    var dateStr  = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    var eventId  = generateId_("evt");
    var recField = (recType === "weekly") ? ("weekly:" + groupId + ":" + weeks) : "none";

    if (i === 0) firstId = eventId;

    sheet.appendRow([
      eventId,
      p.campus_id    || "",
      p.category_id  || "",
      dateStr,
      p.time         || "",
      volIds,
      p.topic_id     || "",
      p.event_type   || "regular",
      recField,
      p.notes        || ""
    ]);
    created++;
  }

  return jsonResponse_({ success: true, event_id: firstId, group_id: groupId, created: created });
}

function handleUpdateEvent_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });

  var sheet   = getSheet_("events");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var rowIndex = findRowIndex_(sheet, "event_id", p.event_id);
  if (rowIndex < 0) return jsonResponse_({ error: "Event not found." });

  var allowed = ["campus_id","category_id","date","time","volunteer_ids","topic_id","event_type","notes"];
  allowed.forEach(function(field) {
    if (p[field] === undefined) return;
    var col = headers.indexOf(field) + 1;
    if (!col) return;
    var val = (field === "volunteer_ids" && Array.isArray(p[field]))
      ? JSON.stringify(p[field])
      : p[field];
    sheet.getRange(rowIndex, col).setValue(val);
  });

  return jsonResponse_({ success: true });
}

function handleDeleteEvent_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var user = getUserById_(userId);
  if (!user || user.role !== "admin") return jsonResponse_({ error: "Admin only." });

  var sheet = getSheet_("events");

  if (p.delete_series && p.group_id) {
    // Delete all events in the recurrence group
    var data    = sheet.getDataRange().getValues();
    var recCol  = data[0].indexOf("recurrence");
    var deleted = 0;
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][recCol]).indexOf(p.group_id) > -1) {
        sheet.deleteRow(i + 1);
        deleted++;
      }
    }
    return jsonResponse_({ success: true, deleted: deleted });
  }

  var rowIndex = findRowIndex_(sheet, "event_id", p.event_id);
  if (rowIndex < 0) return jsonResponse_({ error: "Event not found." });
  sheet.deleteRow(rowIndex);
  return jsonResponse_({ success: true, deleted: 1 });
}


function handleCreateTopic_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  if (!p.title) return jsonResponse_({ error: "Title is required." });

  var topicId = generateId_("top");
  var date    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  getSheet_("topics").appendRow([topicId, p.title, p.passage || "", p.discussion_questions || "", userId, date]);
  return jsonResponse_({ success: true, topic_id: topicId });
}

function handleUpdateTopic_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });

  var sheet   = getSheet_("topics");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowIdx  = findRowIndex_(sheet, "topic_id", p.topic_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Topic not found." });

  ["title","passage","discussion_questions"].forEach(function(f) {
    if (p[f] === undefined) return;
    var col = headers.indexOf(f) + 1;
    if (col) sheet.getRange(rowIdx, col).setValue(p[f]);
  });
  return jsonResponse_({ success: true });
}

function handleDeleteTopic_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var user = getUserById_(userId);
  if (!user || user.role !== "admin") return jsonResponse_({ error: "Admin only." });

  var sheet  = getSheet_("topics");
  var rowIdx = findRowIndex_(sheet, "topic_id", p.topic_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Topic not found." });
  sheet.deleteRow(rowIdx);
  return jsonResponse_({ success: true });
}

function handleCreateAnnouncement_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  if (!p.title || !p.body) return jsonResponse_({ error: "title and body are required." });

  var postId = generateId_("post");
  var date   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  getSheet_("announcements").appendRow([
    postId, p.title, p.body,
    p.media_drive_url || "",
    p.week_label      || "",
    userId, date
  ]);
  return jsonResponse_({ success: true, post_id: postId });
}

function handleDeleteAnnouncement_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var user = getUserById_(userId);
  if (!user || user.role !== "admin") return jsonResponse_({ error: "Admin only." });

  var sheet  = getSheet_("announcements");
  var rowIdx = findRowIndex_(sheet, "post_id", p.post_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Announcement not found." });
  sheet.deleteRow(rowIdx);
  return jsonResponse_({ success: true });
}

function handleCreateCategory_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var user = getUserById_(userId);
  if (!user || user.role !== "admin") return jsonResponse_({ error: "Admin only." });
  if (!p.campus_id || !p.sport_type || !p.age_group) return jsonResponse_({ error: "campus_id, sport_type, and age_group are required." });

  var catId = generateId_("cat");
  getSheet_("categories").appendRow([catId, p.campus_id, p.sport_type, p.age_group]);
  return jsonResponse_({ success: true, category_id: catId });
}

function handleUpdateCategory_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var user = getUserById_(userId);
  if (!user || user.role !== "admin") return jsonResponse_({ error: "Admin only." });

  var sheet   = getSheet_("categories");
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowIdx  = findRowIndex_(sheet, "category_id", p.category_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Category not found." });

  ["campus_id","sport_type","age_group"].forEach(function(f) {
    if (p[f] === undefined) return;
    var col = headers.indexOf(f) + 1;
    if (col) sheet.getRange(rowIdx, col).setValue(p[f]);
  });
  return jsonResponse_({ success: true });
}

// =============================================================
//  PHOTOS / GALLERY
// =============================================================

// Run once after initial setup to add the photos sheet tab
function addPhotosSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (ss.getSheetByName("photos")) { Logger.log("photos sheet already exists."); return; }
  var sheet   = ss.insertSheet("photos");
  var headers = ["photo_id","drive_file_id","campus_id","date_taken","caption","uploaded_by","date_uploaded"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var hr = sheet.getRange(1, 1, 1, headers.length);
  hr.setBackground("#0D4F4F"); hr.setFontColor("#FFFFFF"); hr.setFontWeight("bold");
  sheet.setFrozenRows(1);
  Logger.log("photos sheet created.");
}

function getOrCreateFolder_(parentId, name) {
  var parent = DriveApp.getFolderById(parentId);
  var iter   = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function getWeekLabel_(dateStr) {
  var d = new Date(dateStr + "T00:00:00Z");
  var dow = d.getUTCDay(); // 0=Sun
  var monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  return "Week of " + Utilities.formatDate(monday, "UTC", "MMM d, yyyy");
}

function handleUploadPhoto_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  if (!p.filename || !p.base64 || !p.campus_id || !p.date_taken) {
    return jsonResponse_({ error: "filename, base64, campus_id, and date_taken are required." });
  }

  var campuses   = sheetToObjects_(getSheet_("campuses"));
  var campus     = campuses.find(function(c) { return c.campus_id === p.campus_id; });
  var campusName = campus ? campus.campus_name : p.campus_id;
  var weekLabel  = getWeekLabel_(p.date_taken);

  // Folder path: root / Campus / "Week of ..." / date_taken
  var campusFolder = getOrCreateFolder_(PHOTOS_FOLDER_ID, campusName);
  var weekFolder   = getOrCreateFolder_(campusFolder.getId(), weekLabel);
  var dayFolder    = getOrCreateFolder_(weekFolder.getId(), p.date_taken);

  var mimeType = p.mimeType || "image/jpeg";
  var blob     = Utilities.newBlob(Utilities.base64Decode(p.base64), mimeType, p.filename);
  var file     = dayFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Auto-create photos sheet if it doesn't exist yet
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var photosSheet = ss.getSheetByName("photos");
  if (!photosSheet) {
    photosSheet = ss.insertSheet("photos");
    var hdrs = ["photo_id","drive_file_id","campus_id","date_taken","caption","uploaded_by","date_uploaded"];
    photosSheet.getRange(1, 1, 1, hdrs.length).setValues([hdrs]);
    var hr = photosSheet.getRange(1, 1, 1, hdrs.length);
    hr.setBackground("#0D4F4F"); hr.setFontColor("#FFFFFF"); hr.setFontWeight("bold");
    photosSheet.setFrozenRows(1);
  }

  var photoId = generateId_("ph");
  var today   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  photosSheet.appendRow([photoId, file.getId(), p.campus_id, p.date_taken, p.caption || "", userId, today]);

  return jsonResponse_({ success: true, photo_id: photoId, drive_file_id: file.getId() });
}

function handleGetPhotos_(e) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("photos");
  if (!sheet) return jsonResponse_([]);
  var campusId = e.parameter.campus_id || "";
  var photos   = sheetToObjects_(sheet);
  if (campusId) photos = photos.filter(function(ph) { return ph.campus_id === campusId; });
  photos.sort(function(a, b) { return a.date_taken < b.date_taken ? 1 : -1; });
  return jsonResponse_(photos);
}

function handleGetWeeklyHighlight_(e) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("photos");
  if (!sheet) return jsonResponse_([]);
  var today  = new Date();
  var dow    = today.getUTCDay();
  var monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((dow + 6) % 7));
  var sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  var mon = Utilities.formatDate(monday, "UTC", "yyyy-MM-dd");
  var sun = Utilities.formatDate(sunday, "UTC", "yyyy-MM-dd");
  var photos = sheetToObjects_(sheet).filter(function(ph) {
    return ph.date_taken >= mon && ph.date_taken <= sun;
  });
  return jsonResponse_(photos.slice(0, 12));
}

function handleDeletePhoto_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var user = getUserById_(userId);
  if (!user || user.role !== "admin") return jsonResponse_({ error: "Admin only." });

  var sheet  = getSheet_("photos");
  var rowIdx = findRowIndex_(sheet, "photo_id", p.photo_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Photo not found." });
  sheet.deleteRow(rowIdx);
  return jsonResponse_({ success: true });
}

function handleDeleteCategory_(p) {
  var userId = validateToken_(p.token);
  if (!userId) return jsonResponse_({ error: "Unauthorized." });
  var user = getUserById_(userId);
  if (!user || user.role !== "admin") return jsonResponse_({ error: "Admin only." });

  var sheet  = getSheet_("categories");
  var rowIdx = findRowIndex_(sheet, "category_id", p.category_id);
  if (rowIdx < 0) return jsonResponse_({ error: "Category not found." });
  sheet.deleteRow(rowIdx);
  return jsonResponse_({ success: true });
}
