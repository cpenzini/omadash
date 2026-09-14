#include "attachments.h"
#include <QFile>
#include <QSaveFile>
#include <QRegularExpression>
namespace Attachments {
QJsonArray collect(const QJsonObject&p){QJsonArray out;QString name=p["filename"].toString();auto b=p["body"].toObject();bool explicitAttachment=false;for(auto h:p["headers"].toArray()){auto v=h.toObject();if(v["name"].toString().compare("Content-Disposition",Qt::CaseInsensitive)==0&&v["value"].toString().startsWith("attachment",Qt::CaseInsensitive))explicitAttachment=true;}if(!name.isEmpty()||explicitAttachment)out.append(QJsonObject{{"name",name.isEmpty()?"attachment":name},{"mime",p["mimeType"]},{"size",b["size"]},{"id",b["attachmentId"]},{"data",b["data"]}});for(auto part:p["parts"].toArray())for(auto a:collect(part.toObject()))out.append(a);return out;}
QString safeName(QString name){name.replace('\\','/');name=name.section('/',-1);name.remove(QRegularExpression("[\\x00-\\x1f\\x7f]"));name=name.trimmed();if(name.isEmpty()||name=="."||name=="..")return "attachment";return name.left(180);}
bool save(const QString&path,const QByteArray&bytes,QString*error){QSaveFile f(path);if(!f.open(QIODevice::WriteOnly)||!f.setPermissions(QFile::ReadOwner|QFile::WriteOwner)||f.write(bytes)!=bytes.size()||!f.commit()){if(error)*error="Could not save the attachment. Choose another location and try again.";return false;}return true;}
}
