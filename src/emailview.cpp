#include "emailview.h"
#include <QWebEngineView>
#include <QWebEnginePage>
#include <QWebEngineProfile>
#include <QWebEngineSettings>
#include <QWebEngineUrlRequestInterceptor>
#include <QWebEngineUrlRequestInfo>
#include <QWebEngineDownloadRequest>
#include <QDesktopServices>
#include <QVBoxLayout>
#include <QPushButton>
#include <QLabel>
#include <atomic>
namespace {
class RequestGate:public QWebEngineUrlRequestInterceptor{
public:using QWebEngineUrlRequestInterceptor::QWebEngineUrlRequestInterceptor;std::atomic_bool images{false};
 void interceptRequest(QWebEngineUrlRequestInfo&r)override{auto scheme=r.requestUrl().scheme();bool local=scheme=="data"||scheme=="about";bool image=images&&r.resourceType()==QWebEngineUrlRequestInfo::ResourceTypeImage&&(scheme=="https"||scheme=="http");r.block(!local&&!image);if(image)r.setHttpHeader("Referer",QByteArray());}
};
class MailPage:public QWebEnginePage{
public:using QWebEnginePage::QWebEnginePage;
 bool acceptNavigationRequest(const QUrl&url,NavigationType type,bool main)override{if(main&&type==NavigationTypeLinkClicked&&EmailView::externalLink(url))QDesktopServices::openUrl(url);return main&&(url.scheme()=="data"||url==QUrl("about:blank"))&&type!=NavigationTypeLinkClicked;}
 QWebEnginePage*createWindow(WebWindowType)override{return nullptr;}
};
}
bool EmailView::externalLink(const QUrl&url){return url.isValid()&&(url.scheme()=="https"||url.scheme()=="http"||url.scheme()=="mailto");}
QString EmailView::document(const QString&html,bool images){QString csp="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:"+QString(images?" https: http:":"")+"; font-src data:; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'; connect-src 'none'; media-src 'none';";return "<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\""+csp+"\"><meta name=\"referrer\" content=\"no-referrer\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>html{background:white;color:#222;color-scheme:light}body{margin:12px;font:15px/1.5 sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}pre{white-space:pre-wrap}iframe,object,embed,form,video,audio{display:none!important}</style></head><body>"+html+R"(<style>
html {width:100%!important;min-width:0!important;box-sizing:border-box}
body {width:auto!important;max-width:none!important;min-width:0!important;margin:8px!important;overflow-wrap:anywhere!important}
body div,body section,body article,body center {min-width:0!important;max-width:100%!important;box-sizing:border-box}
body>div,body>section,body>article,body>center,body div[style*="max-width"],body div[style*="width:"] {width:auto!important;max-width:none!important}
table {width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;box-sizing:border-box}
td,th {min-width:0!important;overflow-wrap:anywhere!important}
img {max-width:100%!important;height:auto!important;box-sizing:border-box}
pre {white-space:pre-wrap!important;overflow-wrap:anywhere!important}
</style></body></html>)";}
EmailView::EmailView(const QString&html,QWidget*parent,bool images):QWidget(parent),source(html){setProperty("externalImagesEnabled",images);setMinimumWidth(0);setSizePolicy(QSizePolicy::Ignored,QSizePolicy::Preferred);auto*l=new QVBoxLayout(this);l->setContentsMargins(0,8,0,8);view=new QWebEngineView(this);view->setObjectName("htmlEmailBody");view->setContextMenuPolicy(Qt::NoContextMenu);view->setMinimumHeight(220);view->setSizePolicy(QSizePolicy::Expanding,QSizePolicy::Fixed);auto*profile=new QWebEngineProfile(this);profile->setHttpCacheType(QWebEngineProfile::MemoryHttpCache);profile->setPersistentCookiesPolicy(QWebEngineProfile::NoPersistentCookies);auto*gate=new RequestGate(profile);gate->images=images;profile->setUrlRequestInterceptor(gate);connect(profile,&QWebEngineProfile::downloadRequested,profile,[](QWebEngineDownloadRequest*r){r->cancel();});auto*page=new MailPage(profile,view);view->setPage(page);auto*s=page->settings();for(auto flag:{QWebEngineSettings::JavascriptEnabled,QWebEngineSettings::JavascriptCanOpenWindows,QWebEngineSettings::JavascriptCanAccessClipboard,QWebEngineSettings::LocalStorageEnabled,QWebEngineSettings::LocalContentCanAccessFileUrls,QWebEngineSettings::PluginsEnabled,QWebEngineSettings::FullScreenSupportEnabled,QWebEngineSettings::ScreenCaptureEnabled,QWebEngineSettings::NavigateOnDropEnabled})s->setAttribute(flag,false);s->setAttribute(QWebEngineSettings::LocalContentCanAccessRemoteUrls,true);s->setAttribute(QWebEngineSettings::ShowScrollBars,true);connect(page,&QWebEnginePage::contentsSizeChanged,this,[this](QSizeF size){view->setFixedHeight(qBound(220,int(size.height())+8,12000));});connect(view,&QWebEngineView::loadFinished,this,[this,l](bool ok){if(!ok){auto*note=new QLabel("Formatted view could not load. Use Plain text above to read this message.");note->setWordWrap(true);l->addWidget(note);}});l->addWidget(view);render(images);}
void EmailView::render(bool images){view->setHtml(document(source,images),QUrl("about:blank"));}

EmailView::~EmailView(){delete view;}
