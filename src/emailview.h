#pragma once
#include <QWidget>
#include <QUrl>
class QWebEngineView;
class EmailView:public QWidget{
 Q_OBJECT
public:
 explicit EmailView(const QString&html,QWidget*parent=nullptr,bool images=false);
 ~EmailView() override;
 static QString document(const QString&html,bool images);
 static bool externalLink(const QUrl&url);
private:
 QWebEngineView*view;QString source;void render(bool images);
};
