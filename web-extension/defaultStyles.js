const defaultStyles = [
    {
        title: 'Reddit Comments',
        url: 'reddit\\.com\\/r\\/[^\\/]+\\/comments',
        style: `.side {
display: none;
}
#header {
display: none;
}
.arrow, .expand, .score, .live-timestamp, .flat-list, .buttons, .morecomments, .footer-parent, .icon {
display: none !important;
}
`
    },{
        title: 'Wikipedia Article',
        url: 'wikipedia\\.org\\/wiki\\/',
        style: `#mw-navigation {
display: none;
}
#footer {
display: none;
}
#mw-panel {
display: none;
}
#mw-head {
display: none;
}
`
    },{
        title: 'YCombinator News Comments',
        url: 'news\\.ycombinator\\.com\\/item\\?id=[0-9]+',
        style: `#hnmain > tbody > tr:nth-child(1) > td > table {
display: none;
}
* {
background-color: white;
}
.title, .storylink {
text-align: left;
font-weight: bold;
font-size: 20px;
}
.score {
display: none;
}
.age {
display: none;
}
.hnpast {
display: none;
}
.togg {
display: none;
}
.votelinks, .rank {
display: none;
}
.votearrow {
display: none;
}
.yclinks {
display: none;
}
form {
display: none;
}
a.hnuser {
font-weight: bold;
color: black !important;
padding: 3px;
}
.subtext > span, .subtext > a:not(:nth-child(2)) {
display: none;
}
`
    },{
        title: 'Medium Article',
        url: 'medium\\.com',
        style: `.metabar {
display: none !important;
}
header.container {
display: none;
}
.js-postShareWidget {
display: none;
}
footer, canvas {
display: none !important;
}
.u-fixed, .u-bottom0 {
display: none;
}
`
    },{
        title: 'Twitter',
        url: 'twitter\\.com\\/.+',
        style: `.topbar {
display: none !important;
}
.ProfileCanopy, .ProfileCanopy-inner {
display: none;
}
.ProfileSidebar {
display: none;
}
.ProfileHeading {
display: none !important;
}
.ProfileTweet-actionList {
display: none;
}
`
    }

];

export default Object.freeze(defaultStyles);