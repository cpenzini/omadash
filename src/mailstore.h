#pragma once
#include <QJsonObject>
#include <QJsonArray>
#include <QStringList>
#include <QVector>
class MailStore {
public:
 QJsonArray accounts,splits,threads;
 QJsonObject drafts;
 explicit MailStore(bool persist=true);
 QString accountEmail(const QString &id) const;
 QString matchingSplit(const QJsonObject &thread) const;
 bool matches(const QJsonObject &thread,const QString &query,QString *error=nullptr) const;
 QVector<int> visible(const QString &account,const QString &split,const QString &view,const QString &query,QString *error=nullptr) const;
 QJsonObject replyDraft(int thread,int message,const QString &mode) const;
 void change(const QVector<int>&indices,const QString&action);
 bool undo();
 bool save();
 void setSessionOnly(bool value){sessionOnly=value;}
 QString saveError;
private:
 bool persistent;bool sessionOnly=false;
 QVector<QJsonArray> history;
};
