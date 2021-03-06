const JQ_REPO_FIELD  = $('#repo');
const JQ_SEARCH_BTN  = $('#searchBtn');
const JQ_TOTAL_CALLS = $('#totalApiCalls');
const JQ_POPUP_TITLE = $('#modalCardTitle');
const JQ_TOKEN_CLOSE = $('#closeModalBtn');
const JQ_TOKEN_FIELD = $('#tokenInput');
const JQ_TOKEN_SAVE  = $('#saveTokenBtn');
const JQ_TOKEN_BTN   = $('#addTokenBtn');
const JQ_POPUP       = $('#useful_forks_token_popup');


const EXAMPLE_LINK_1 = `<a href='https://useful-forks.github.io/?repo=payne911/PieMenu'
                           onclick="gtag('event', 'discovery', {
                             'event_category': 'landing-intro',
                             'event_label': 'short-example-link'
                           });">payne911/PieMenu</a>`;
const EXAMPLE_LINK_2 = `<a href='https://useful-forks.github.io/?repo=https://github.com/payne911/PieMenu'
                           onclick="gtag('event', 'discovery', {
                             'event_category': 'landing-intro',
                             'event_label': 'full-example-link'
                           });">https://github.com/payne911/PieMenu</a>`;
const BODY_REPO_LINK = `<a href='https://github.com/useful-forks/useful-forks.github.io'
                           onclick="gtag('event', 'discovery', {
                             'event_category': 'landing-intro',
                             'event_label': 'repo-link'
                           });">the GitHub project</a>`;
const INIT_MSG = "<b>Introducing:</b><br/><br/>"
    + "<img src='assets/useful-forks-banner.png' alt='useful-forks banner' width='500'/><br/><br/>"
    + "It aims at increasing the discoverability of <b>useful</b> forks of open-source projects.<br/>"
    + "Simply type a repository's URL in the Text Field above. Both of those examples are valid entries: <br/>"
    + "<b>" + EXAMPLE_LINK_1 + "</b> and <b>" + EXAMPLE_LINK_2 + "</b><br/><br/>"
    + "The criteria is simple: <b>if a fork was created, but never received any other activity on its master branch, it is filtered out.</b><br/>"
    + "The results are sorted by the amount of stars.<br/><br/>"
    + "For more information, check out " + BODY_REPO_LINK + ".<br/>"
    + "And while you're there, if you like this project, feel free to ⭐ us."


/* Gather the saved Access Token */
const GITHUB_ACCESS_TOKEN_STORAGE_KEY = "useful-forks-access-token";
let token = localStorage.getItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
drawAddTokenBtn(token);


/* Initialize the structure used by the 'queries-logic.js' */
$('#useful_forks_inject').append(
    $('<div>', {id: UF_ID_WRAPPER}).append(
        $('<div>', {id: UF_ID_HEADER}),
        $('<div>', {id: UF_ID_MSG}).html(INIT_MSG),
        $('<div>', {id: UF_ID_DATA}).append(
            $('<table>', {id: UF_ID_TABLE}).append(
                $('<tbody>')
            )
        )
    )
);

function closeTokenDialog() {
  JQ_POPUP.removeClass('is-active');
  JQ_REPO_FIELD.focus();
}

function openTokenDialog() {
  JQ_POPUP.addClass('is-active');
  JQ_TOKEN_FIELD.focus();
}

function enableQueryFields() {
  JQ_REPO_FIELD.prop('disabled', false);
  JQ_SEARCH_BTN.removeClass('is-loading');
}

function disableQueryFields() {
  JQ_REPO_FIELD.prop('disabled', true);
  JQ_SEARCH_BTN.addClass('is-loading');
}

function disableQueryBtn() {
  JQ_SEARCH_BTN.prop('disabled', true);
  JQ_SEARCH_BTN.removeClass('is-loading');
}

function getQueryOrDefault(defaultVal) {
  if (!JQ_REPO_FIELD.val()) {
    JQ_REPO_FIELD.val(defaultVal);
  }
  return JQ_REPO_FIELD.val();
}

function setApiCallsLabel(total) {
  JQ_TOTAL_CALLS.html(total + " calls");
}

/** Extracts 'user' and 'repo' values from potential URL inputs. */
function initiate_search() {

  /* Checking if search is allowed. */
  if (ONGOING_REQUESTS_COUNTER !== 0 || JQ_SEARCH_BTN.hasClass('is-loading')) {
    return; // abort
  }

  clear_old_data();

  let queryString = getQueryOrDefault("payne911/PieMenu");
  let queryValues = queryString.split('/').filter(Boolean);

  let len = queryValues.length;
  if (len < 2) {
    getElementById_$(UF_ID_MSG).html('Please enter a valid query: it should contain two strings separated by a "/"');

    gtag('event', 'query', {
      'event_category': 'Raw-Search-Query-Fault',
      'event_label': queryString
    });

    return; // abort
  }

  let user = queryValues[len - 2];
  let repo = queryValues[len - 1];

  gtag('event', 'query', {
    'event_category': 'Search-Query',
    'event_label': `${user}/${repo}`
  });

  initiateProcess(user, repo, token);
}

JQ_SEARCH_BTN.click(event => {
  event.preventDefault();
  initiate_search();
});

JQ_REPO_FIELD.keyup(event => {
  if (event.keyCode === 13) { // 'ENTER'
    initiate_search();
  }
});

JQ_TOKEN_BTN.click(event => {
  event.preventDefault();
  openTokenDialog();
});

JQ_TOKEN_CLOSE.click(event => {
  event.preventDefault();
  closeTokenDialog();
});

JQ_TOKEN_SAVE.click(event => {
  event.preventDefault();
  const INPUT_TOKEN = JQ_TOKEN_FIELD.val();
  localStorage.setItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY, INPUT_TOKEN);
  drawAddTokenBtn(INPUT_TOKEN);
  closeTokenDialog();
});

JQ_TOKEN_FIELD.keyup(event => {
  if (event.keyCode === 13) { // 'ENTER'
    JQ_TOKEN_SAVE.click();
  }
  if (event.keyCode === 27) { // 'ESC'
    closeTokenDialog();
  }
});

function drawAddTokenBtn(accessToken) {
  let verb = 'Add';
  if (accessToken) {
    verb = 'Edit';
    JQ_TOKEN_FIELD.val(accessToken);
  }
  JQ_TOKEN_BTN.html('<img src="assets/settings-icon.png" alt="settings" />'
      + '<strong>&nbsp;&nbsp;' + verb + ' Access Token</strong>');
  JQ_POPUP_TITLE.html(verb + ' GitHub Access Token');
}

function automaticSearch(searchValue) {
  JQ_REPO_FIELD.val(searchValue);
  JQ_SEARCH_BTN.click();
}

function getRepoNameFromUrl() {
  let repo = new URLSearchParams(location.search).get('repo');
  if (!repo) {
    repo = new URLSearchParams(location.search).get('repository');
  }
  return repo;
}

/* Automatically queries when an URL parameter is present. */
const query = getRepoNameFromUrl();
if (query) {
  automaticSearch(query);
}