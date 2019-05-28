const WARNING = 'warning';
const ERROR = 'error';
const GENERAL = 'general';
const SUCCESS = 'success';

exports.messageGroup = {
  request: 'requestGroup'
}

exports.requestMessage = {
  content: 'Podra acceder a la información cuando acepten su solicitud',
  type: WARNING,
  icon: ''
}

exports.noSavingMessage = {
  content: 'No se encuentra en una natillera, debe solicitar el acceso a una',
  type: ERROR,
  icon: '',
  action: 'joinRequest',
  actionText: 'Solicitar'
}