import 'package:flutter_omarchy/flutter_omarchy.dart';
import 'package:omadash/src/app.dart';
import 'package:omadash/src/store.dart';

Future<void> main() async {
  await Omarchy.initialize();
  final store = MailStore();
  await store.hydrate();
  runApp(OmadashApp(store: store));
}
