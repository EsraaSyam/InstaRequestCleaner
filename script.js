
const fileInput = document.getElementById("fileInput");
const statusMessage = document.getElementById("status");
const resultsSection = document.getElementById("results");
const countLabel = document.getElementById("count");
const searchInput = document.getElementById("searchInput");
const accountList = document.getElementById("accountList");
const emptyState = document.getElementById("emptyState");

let usernames = [];

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`.trim();
}

function renderAccounts(query = "") {
  accountList.replaceChildren();

  const normalizedQuery = query.trim().replace(/^@/, "").toLowerCase();

  const filtered = usernames.filter(username =>
    username.toLowerCase().includes(normalizedQuery)
  );

  for (const username of filtered) {
    const item = document.createElement("li");
    item.className = "account-card";

    const name = document.createElement("span");
    name.className = "username";
    name.textContent = `@${username}`;

    const link = document.createElement("a");
    link.className = "profile-link";
    link.href = `https://www.instagram.com/${encodeURIComponent(username)}/`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open profile ↗";
    link.setAttribute("aria-label", `Open Instagram profile for ${username}`);

    item.append(name, link);
    accountList.appendChild(item);
  }

  countLabel.textContent =
    `${filtered.length} ${filtered.length === 1 ? "account" : "accounts"}`;

  emptyState.hidden = filtered.length > 0;
}

function extractUsernames(doc) {
  const accounts = new Set();

  // Instagram exports may contain tables with a Username column.
  for (const row of doc.querySelectorAll("tr")) {
    const cells = [...row.querySelectorAll("th, td")];
    if (cells.length < 2) continue;

    const label = cells[0].textContent.trim().toLowerCase();
    const username = cells[1].textContent.trim();

    if (
      label === "username" &&
      /^[a-zA-Z0-9._]{1,30}$/.test(username)
    ) {
      accounts.add(username);
    }
  }

  // Some exports contain links to Instagram profiles instead.
  for (const anchor of doc.querySelectorAll("a[href]")) {
    try {
      const url = new URL(anchor.getAttribute("href"), "https://www.instagram.com");

      if (
        !["instagram.com", "www.instagram.com"].includes(url.hostname)
      ) {
        continue;
      }

      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length !== 1) continue;

      const username = parts[0];

      if (
        /^[a-zA-Z0-9._]{1,30}$/.test(username) &&
        !["accounts", "about", "explore", "direct", "p", "reel"]
          .includes(username.toLowerCase())
      ) {
        accounts.add(username);
      }
    } catch {
      // Ignore invalid links.
    }
  }

  return [...accounts].sort((a, b) => a.localeCompare(b));
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  resultsSection.hidden = true;
  searchInput.value = "";
  searchInput.disabled = true;
  usernames = [];
  accountList.replaceChildren();
  setStatus("Taking a look at your request list...");

  try {
    const html = await file.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pageText = doc.body.textContent || "";

    const receivedRequests =
      /Follow Requests You've Received/i.test(pageText);

    const sentRequests =
      /Follow Requests You've Sent/i.test(pageText) ||
      /pending_follow_requests|recent_follow_requests/i.test(file.name);

    if (receivedRequests && !sentRequests) {
      setStatus(
        "This is your received-requests file, not the list you sent. Choose the sent-requests export and we’ll pick up from there.",
        "error"
      );
      return;
    }

    usernames = extractUsernames(doc);

    if (usernames.length === 0) {
      setStatus(
        "We couldn’t find any usernames in that file. Try the sent-requests HTML export.",
        "error"
      );
      return;
    }

    resultsSection.hidden = false;
    searchInput.disabled = false;
    renderAccounts();

    setStatus(
      `Your list is ready: ${usernames.length} ${usernames.length === 1 ? "request" : "requests"} to review.`,
      "success"
    );
  } catch {
    setStatus(
      "That file wouldn’t open here. Choose a valid Instagram HTML export and try again.",
      "error"
    );
  }
});

searchInput.addEventListener("input", () => {
  renderAccounts(searchInput.value);
});
