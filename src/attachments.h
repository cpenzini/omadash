#pragma once
#include <QJsonArray>
#include <QJsonObject>
#include <QString>
namespace Attachments {
QJsonArray collect(const QJsonObject& payload);
QString safeName(QString name);
bool save(const QString& path,const QByteArray& bytes,QString* error);
}
