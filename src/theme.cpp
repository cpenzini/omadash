#include "theme.h"
#include <QFile>
#include <QRegularExpression>
#include <QMap>
MailTheme MailTheme::load(const QString&directory){
 MailTheme result;QMap<QString,QString> colors;
 QFile file(directory+"/colors.toml");
 if(file.open(QIODevice::ReadOnly)){
  auto text=QString::fromUtf8(file.read(65536));
  QRegularExpression re(R"re(^\s*([a-zA-Z0-9_]+)\s*=\s*["'](#[0-9a-fA-F]{6})["'])re",QRegularExpression::MultilineOption);
  auto matches=re.globalMatch(text);while(matches.hasNext()){auto m=matches.next();colors[m.captured(1)]=m.captured(2);}
 }else{
  QFile terminal(directory+"/alacritty.toml");if(terminal.open(QIODevice::ReadOnly)){
   QString section;for(auto line:QString::fromUtf8(terminal.read(65536)).split('\n')){
    line=line.trimmed();if(line.startsWith('[')){section=line;continue;}
    auto m=QRegularExpression(R"re(^(\w+)\s*=\s*["'](#[0-9a-fA-F]{6})["'])re").match(line);
    if(m.hasMatch()&&(section=="[colors.primary]"||section=="[colors.normal]"))colors[m.captured(1)]=m.captured(2);
   }
  }
 }
 if(colors.contains("background")&&colors.contains("foreground")){
  result.loaded=true;result.background=QColor(colors["background"]);result.foreground=QColor(colors["foreground"]);
  result.accent=QColor(colors.value("accent",colors.value("selection_background",colors.value("color4",colors.value("blue","#8b91c9")))));
  // Unread is always blue, independently of the theme's accent hue.
  result.blue=QColor(colors.value("color4",colors.value("blue","#64b9e4")));
 }
 return result;
}
QColor MailTheme::blend(double amount)const{return QColor(qRound(background.red()*(1-amount)+foreground.red()*amount),qRound(background.green()*(1-amount)+foreground.green()*amount),qRound(background.blue()*(1-amount)+foreground.blue()*amount));}
