#pragma once
#include "google.h"
#include "localcache.h"
#include <QSet>
class MailSync:public QObject {
 Q_OBJECT
 GoogleClient*client;LocalCache*cache;QString account;bool busy=false;QTimer timer;
 void baseline();void history();void fetch(const QStringList&,std::function<void(bool)>);
 void finish(bool);
public:
 MailSync(GoogleClient*,LocalCache*,const QString&,QObject*parent=nullptr);
 void start();void refresh();
 signals:void updated(QString account);void progress(QString account,QString message);
};
