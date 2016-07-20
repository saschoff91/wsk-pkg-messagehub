/*
 * Copyright 2015-2016 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package packages

import common._
import org.junit.runner.RunWith
import org.scalatest.Matchers
import org.scalatest.junit.JUnitRunner
import spray.json._
import spray.json.DefaultJsonProtocol.StringJsonFormat
import scala.collection.immutable.HashMap
import org.scalatest.FlatSpecLike

@RunWith(classOf[JUnitRunner])
class MessageHubTests extends TestHelpers with WskTestHelpers with Matchers {

  implicit val wskprops = WskProps()
  val wsk = new Wsk()

  val credentials = TestUtils.getVCAPcredentials("messagehub")
  val restUrl = credentials.get("restUrl");
  val restPort = credentials.get("restPort");
  val apikey = credentials.get("apikey");
  val serviceEndpoint = credentials.get("serviceEndpoint");


  behavior of "MessageHub Package"

  "get topic action" should "return all topics" in {
    val actionName = "/whisk.system/messagehub/getTopics"
    val params = HashMap("restUrl" -> restUrl.toJson, "restPort" -> restPort.toJson, "apikey" -> apikey.toJson);

    withActivation(wsk.activation, wsk.action.invoke(actionName, params)) {
      _.fields("response").toString should include(s"""""markedForDeletion": false"""")
    }
  }

  "create topic action" should "return, create successfull" in {
    val actionName = "/whisk.system/messagehub/createTopic"
    val params = HashMap("restUrl" -> restUrl.toJson, "restPort" -> restPort.toJson, "apikey" -> apikey.toJson, "topic" -> "testTopic".toJson );

    withActivation(wsk.activation, wsk.action.invoke(actionName, params)) {
      _.fields("response").toString should include(s"""""topic created successfully"""")
    }
  }

    "publish message action" should "return, publish successfull" in {
    val actionName = "/whisk.system/messagehub/publish"
    val params = HashMap("restUrl" -> restUrl.toJson, "restPort" -> restPort.toJson, "apikey" -> apikey.toJson, "topic" -> "testTopic".toJson, "message" -> "test message input".toJson );

    withActivation(wsk.activation, wsk.action.invoke(actionName, params)) {
      _.fields("response").toString should include(s"""""offsets"""")
    }
  }

      "delete topic action" should "return, deletion successfull" in {
    val actionName = "/whisk.system/messagehub/deleteTopic"
    val params = HashMap("restUrl" -> restUrl.toJson, "restPort" -> restPort.toJson, "apikey" -> apikey.toJson, "topic" -> "testTopic".toJson);

    withActivation(wsk.activation, wsk.action.invoke(actionName, params)) {
      _.fields("response").toString should include(s"""""topic deleted successfully"""")
    }
  }


}
